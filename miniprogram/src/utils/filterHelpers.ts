export function getItemFilterTag(item: any, category: string): string {
  const model = (item.model || '').toUpperCase();
  let specs: any = {};
  if (item.specs) {
    try {
      specs = typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs;
    } catch (e) {}
  }

  if (category === 'ram') {
    const kitMatch = model.match(/(\d+)\s*G?\s*\*\s*2/);
    if (kitMatch) return `${kitMatch[1]}G*2`;
    const kitMatchX = model.match(/(\d+)\s*G?\s*[xX]\s*2/);
    if (kitMatchX) return `${kitMatchX[1]}G*2`;
    
    let cap = specs.capacity || 0;
    if (!cap) {
      const capMatch = model.match(/(\d+)G/);
      if (capMatch) cap = parseInt(capMatch[1], 10);
    }
    return cap ? `${cap}G` : '';
  }

  if (category === 'disk') {
    let cap = specs.capacity || 0;
    if (!cap) {
      const capMatch = model.match(/(\d+)\s*(TB|G|GB)/);
      if (capMatch) {
         if (capMatch[2] === 'TB') cap = parseInt(capMatch[1], 10) * 1000;
         else cap = parseInt(capMatch[1], 10);
      }
    }
    if (!cap) return '';
    if (cap >= 1000 && cap % 1000 === 0) return `${cap/1000}TB`;
    return `${cap}G`;
  }

  if (category === 'power') {
    let w = specs.wattage || 0;
    if (!w) {
      const wMatch = model.match(/(\d+)\s*W/);
      if (wMatch) w = parseInt(wMatch[1], 10);
    }
    return w ? `${w}W` : '';
  }

  return '';
}


export function getItemSpecSummary(item: any, category: string): string {
  let specs: any = {};
  if (item.specs) {
    try {
      specs = typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs;
    } catch (e) {}
  }

  let parts: string[] = [];
  if (category === 'cpu') {
    if (specs.cores) parts.push(`${specs.cores}核${specs.threads ? specs.threads+'线程' : ''}`);
    if (specs.base_clock) parts.push(`主频 ${specs.base_clock}`);
    if (specs.boost_clock) parts.push(`睿频 ${specs.boost_clock}`);
    if (specs.socket) parts.push(specs.socket);
  }
  if (category === 'gpu') {
    if (specs.vram) parts.push(`显存 ${specs.vram}`);
  }
  if (category === 'mainboard') {
    if (specs.form_factor) parts.push(specs.form_factor);
    if (specs.memory_type) parts.push(specs.memory_type);
  }
  return parts.join(' | ');
}

export function getMonitorSize(item: any): string {
  if (!item) return '';
  let specs: any = {};
  if (item.specs) {
    try { specs = typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs; } catch(e) {}
  }
  let size = specs.size || 0;
  if (!size) {
    const model = (item.model || '').toUpperCase();
    const m = model.match(/(\d{2}(\.\d+)?)寸|(\d{2}(\.\d+)?)英寸/);
    if (m) size = parseFloat(m[1] || m[3]);
  }
  return size ? `${size}寸` : '';
}

export function getMonitorRefresh(item: any): string {
  if (!item) return '';
  let specs: any = {};
  if (item.specs) {
    try { specs = typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs; } catch(e) {}
  }
  let rr = specs.refresh_rate || 0;
  if (!rr) {
    const model = (item.model || '').toUpperCase();
    const m = model.match(/(\d{2,3})HZ/);
    if (m) rr = parseInt(m[1], 10);
  }
  return rr ? `${rr}Hz` : '';
}


