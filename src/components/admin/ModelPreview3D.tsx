import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface PreviewAsset {
    asset_id: string;
    brand_label?: string;
    brand_cn?: string;
    brand_en?: string;
    model_name?: string;
    buildcores_name?: string;
    model_url?: string;
    interactive_model_url?: string;
    external_model_url?: string;
    served_model_url?: string;
    served_model_available?: boolean;
}

function assetName(asset: PreviewAsset) {
    return [asset.brand_label || asset.brand_cn || asset.brand_en, asset.model_name || asset.buildcores_name]
        .filter(Boolean)
        .join(' · ') || asset.asset_id;
}

function isCompressedBuildCoresUrl(url: string) {
    return /\.glb\.br($|\?)/i.test(url);
}

async function createLoadableModelUrl(asset: PreviewAsset, signal: AbortSignal) {
    if (signal.aborted) throw new Error('模型加载已取消');
    if (asset.served_model_available && asset.served_model_url) {
        return { url: asset.served_model_url, cleanup: () => undefined };
    }

    const directUrl = [asset.model_url, asset.interactive_model_url, asset.external_model_url]
        .find((url) => Boolean(url && !isCompressedBuildCoresUrl(url))) || '';
    if (directUrl) return { url: directUrl, cleanup: () => undefined };

    if (asset.served_model_url) {
        throw new Error('本地 GLB 文件还没有同步到服务器，暂时不能预览这个模型');
    }
    throw new Error('这个模型没有可直接预览的 GLB 文件');
}

export default function ModelPreview3D({ asset }: { asset: PreviewAsset | null }) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [status, setStatus] = useState('请选择左侧模型');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!asset || !mountRef.current) {
            setStatus('请选择左侧模型');
            setError('');
            return;
        }

        const abort = new AbortController();
        const mount = mountRef.current;
        let cleanupModelUrl: () => void = () => undefined;
        let animationFrame = 0;
        setStatus(asset.served_model_available ? '正在加载本地 GLB 模型...' : '正在检查模型文件...');
        setError('');

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf1f5f9);
        const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
        camera.position.set(2.6, 1.8, 3.2);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setSize(mount.clientWidth || 640, mount.clientHeight || 520);
        mount.replaceChildren(renderer.domElement);

        const ktx2Loader = new KTX2Loader()
            .setTranscoderPath('/pc3d/basis/')
            .detectSupport(renderer);
        const gltfLoader = new GLTFLoader().setKTX2Loader(ktx2Loader);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        controls.target.set(0, 0, 0);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.4));
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(4, 5, 4);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 0.8);
        fill.position.set(-3, 2, -4);
        scene.add(fill);
        const grid = new THREE.GridHelper(4, 12, 0xcbd5e1, 0xe2e8f0);
        scene.add(grid);

        const resize = () => {
            const width = Math.max(1, mount.clientWidth || 640);
            const height = Math.max(1, mount.clientHeight || 520);
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);

        const animateScene = () => {
            controls.update();
            renderer.render(scene, camera);
            animationFrame = requestAnimationFrame(animateScene);
        };
        animateScene();

        createLoadableModelUrl(asset, abort.signal)
            .then(({ url, cleanup }) => {
                cleanupModelUrl = cleanup;
                gltfLoader.load(
                    url,
                    (gltf) => {
                        if (abort.signal.aborted) return;
                        const root = gltf.scene;
                        scene.add(root);
                        const box = new THREE.Box3().setFromObject(root);
                        const center = box.getCenter(new THREE.Vector3());
                        const size = box.getSize(new THREE.Vector3());
                        root.position.sub(center);
                        const maxDim = Math.max(size.x, size.y, size.z) || 1;
                        const scale = 2.4 / maxDim;
                        root.scale.setScalar(scale);
                        const distance = Math.max(3, maxDim * scale * 1.8);
                        camera.position.set(distance * 1.15, distance * 0.72, distance * 1.35);
                        controls.target.set(0, 0, 0);
                        controls.update();
                        setStatus(assetName(asset));
                    },
                    undefined,
                    (loadError) => {
                        if (abort.signal.aborted) return;
                        setError(loadError instanceof Error ? loadError.message : '模型解析失败');
                        setStatus('模型加载失败');
                    }
                );
            })
            .catch((loadError) => {
                if (abort.signal.aborted) return;
                setError(loadError instanceof Error ? loadError.message : '模型下载失败');
                setStatus('模型加载失败');
            });

        return () => {
            abort.abort();
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrame);
            cleanupModelUrl();
            controls.dispose();
            ktx2Loader.dispose();
            renderer.dispose();
            scene.traverse((object) => {
                const mesh = object as THREE.Mesh;
                if (mesh.geometry) mesh.geometry.dispose();
                const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
                if (Array.isArray(material)) material.forEach((item) => item.dispose());
                else material?.dispose();
            });
        };
    }, [asset]);

    return (
        <div className="relative h-full min-h-[520px] overflow-hidden bg-slate-100">
            <div ref={mountRef} className="h-full min-h-[520px] w-full" />
            <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-lg border border-white/70 bg-white/85 px-3 py-2 text-xs font-black text-slate-700 shadow-sm backdrop-blur">
                <div className="truncate">{status}</div>
                {error && <div className="mt-1 line-clamp-2 text-[11px] font-bold text-rose-600">{error}</div>}
            </div>
        </div>
    );
}
