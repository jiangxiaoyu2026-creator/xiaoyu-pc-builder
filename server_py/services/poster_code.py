import asyncio
import logging
import os
from time import monotonic

import httpx
from fastapi import HTTPException


_TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/stable_token"
_CODE_URL = "https://api.weixin.qq.com/wxa/getwxacodeunlimit"
_PAGE = "pages/config-share/index"
_INVALID_TOKEN = {40001, 40014, 42001}
_token_lock = asyncio.Lock()
_token_app_id = ""
_token = ""
_expires_at = 0.0

# httpx logs full request URLs at INFO. WeChat requires the token in this URL.
logging.getLogger("httpx").addFilter(lambda record: _CODE_URL not in record.getMessage())


def get_poster_env() -> str:
    version = os.getenv("WECHAT_MINIPROGRAM_ENV_VERSION", "release")
    if version not in {"release", "trial", "develop"}:
        raise HTTPException(503, "小程序码版本配置有误，请联系管理员")
    return version


def _wechat_error(code) -> HTTPException:
    messages = {
        40164: "请联系管理员配置微信服务器 IP 白名单",
        41030: "配置单分享页尚未发布或路径无效，请联系管理员发布正确的小程序版本",
        45009: "小程序码生成次数已达微信限制，请稍后重试",
    }
    return HTTPException(502, messages.get(code, "微信小程序码服务暂时不可用，请稍后重试"))


def _json(response: httpx.Response) -> dict:
    try:
        result = response.json()
    except ValueError:
        result = None
    if not isinstance(result, dict):
        raise _wechat_error(None)
    return result


async def _access_token(client, app_id, secret, rejected=None):
    global _token_app_id, _token, _expires_at
    async with _token_lock:
        if _token_app_id == app_id and _token and _token != rejected and monotonic() < _expires_at:
            return _token

        # Ordinary stable-token reads reuse the valid token across workers. Only
        # force a refresh when WeChat returns the very token it just rejected.
        payload = {"grant_type": "client_credential", "appid": app_id, "secret": secret}
        for force in (False, True):
            response = await client.post(_TOKEN_URL, json={**payload, "force_refresh": force})
            response.raise_for_status()
            data = _json(response)
            token = data.get("access_token")
            expires = data.get("expires_in")
            if not isinstance(token, str) or not token or not isinstance(expires, int) or expires <= 0:
                raise _wechat_error(data.get("errcode"))
            if token != rejected:
                _token_app_id, _token = app_id, token
                _expires_at = monotonic() + max(0, expires - 60)
                return token
        raise _wechat_error(None)


async def get_poster_code(scene: str) -> bytes:
    version = get_poster_env()
    app_id, secret = os.getenv("WECHAT_APP_ID"), os.getenv("WECHAT_APP_SECRET")
    if not app_id or not secret:
        raise HTTPException(503, "小程序码服务尚未配置，请联系管理员")
    payload = {"page": _PAGE, "scene": scene, "env_version": version, "check_path": version == "release"}
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            token = await _access_token(client, app_id, secret)
            for attempt in range(2):
                response = await client.post(_CODE_URL, params={"access_token": token}, json=payload)
                response.raise_for_status()
                if response.content.startswith((b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff")):
                    return response.content
                error = _json(response).get("errcode")
                if error not in _INVALID_TOKEN or attempt:
                    raise _wechat_error(error)
                token = await _access_token(client, app_id, secret, rejected=token)
    except httpx.HTTPError:
        raise _wechat_error(None) from None
