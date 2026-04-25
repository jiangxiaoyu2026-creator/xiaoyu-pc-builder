const fs = require('fs');
const path = require('path');

const DATA_DIR = '/Users/mac/new/Gaming FPS_1';

// Validation rules
const MIN_FPS = 15;  // Minimum reasonable FPS
const MAX_FPS = 1000;

// Check if a line is a data row
function isDataRow(line) {
  return line.startsWith('|') && line.includes('|');
}

// Parse a data row
function parseRow(line) {
  const parts = line.split('|').map(p => p.trim()).filter(p => p);
  if (parts.length < 4) return null;

  return {
    hardware: parts[0],
    resolution: parts[1],
    avg: parts[2],
    low: parts[3]
  };
}

// Validate a row
function validateRow(row) {
  if (!row) return { valid: false, reason: 'parse_error' };

  // Extract FPS numbers
  const avgMatch = row.avg.match(/(\d+)/);
  const lowMatch = row.low.match(/(\d+)/);

  if (!avgMatch || !lowMatch) {
    return { valid: false, reason: 'no_number' };
  }

  const avg = parseInt(avgMatch[1]);
  const low = parseInt(lowMatch[1]);

  // Check for obviously invalid data (10 FPS with ratio 1.0)
  if (avg === 10 && low === 10) {
    return { valid: false, reason: 'invalid_10_fps' };
  }

  // Check FPS range
  if (avg < MIN_FPS || avg > MAX_FPS) {
    return { valid: false, reason: 'out_of_range' };
  }

  // Check Low <= Avg
  if (low > avg) {
    return { valid: false, reason: 'low_higher_than_avg' };
  }

  // Check ratio (Low/Avg should be reasonable, but we allow 0.25-0.98)
  const ratio = low / avg;
  if (ratio < 0.2 || ratio > 1.0) {
    return { valid: false, reason: 'bad_ratio_' + ratio.toFixed(2) };
  }

  return { valid: true };
}

// Process a single file
function processFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');

  const validRows = [];
  const invalidRows = [];
  let headerLines = [];

  for (const line of lines) {
    // Keep header and metadata lines
    if (!isDataRow(line)) {
      headerLines.push(line);
      continue;
    }

    const row = parseRow(line);
    const validation = validateRow(row);

    if (validation.valid) {
      validRows.push({ line, row });
    } else {
      invalidRows.push({ line, row, reason: validation.reason });
    }
  }

  return { validRows, invalidRows, headerLines };
}

// Main
function main() {
  const files = fs.readdirSync(DATA_DIR).filter(f =>
    f.startsWith('howmanyfps_') && (f.endsWith('_cpu_data.md') || f.endsWith('_gpu_data.md'))
  );

  console.log('=== 数据清理 ===\n');

  let totalValid = 0;
  let totalInvalid = 0;
  const summary = [];

  for (const file of files) {
    const filepath = path.join(DATA_DIR, file);
    const { validRows, invalidRows, headerLines } = processFile(filepath);

    if (invalidRows.length > 0) {
      // Write cleaned data
      let newContent = headerLines.join('\n') + '\n';
      newContent += '| ' + validRows[0]?.row.hardware + ' | 分辨率 | Real-Time Average | 1% Lows |\n';
      newContent += '|-----|--------|-------------------|--------|\n';

      for (const { row } of validRows) {
        newContent += `| ${row.hardware} | ${row.resolution} | ${row.avg} | ${row.low} |\n`;
      }

      fs.writeFileSync(filepath, newContent);

      // Save invalid entries to issues file
      const issuesFile = filepath.replace('_data.md', '_issues_cleanup.json');
      fs.writeFileSync(issuesFile, JSON.stringify(invalidRows.map(r => ({
        hardware: r.row?.hardware,
        resolution: r.row?.resolution,
        reason: r.reason
      })), null, 2));

      summary.push({
        file,
        valid: validRows.length,
        invalid: invalidRows.length,
        percent: ((invalidRows.length / (validRows.length + invalidRows.length)) * 100).toFixed(1)
      });

      totalValid += validRows.length;
      totalInvalid += invalidRows.length;
    }
  }

  // Print summary
  console.log('清理结果：\n');
  console.log('文件                          | 有效  | 无效  | 无效率');
  console.log('------------------------------|-------|-------|-------');
  for (const s of summary.sort((a, b) => b.percent - a.percent)) {
    const name = s.file.replace('howmanyfps_', '').replace('_data.md', '');
    console.log(`${name.padEnd(28)}| ${String(s.valid).padStart(5)} | ${String(s.invalid).padStart(5)} | ${s.percent}%`);
  }
  console.log('------------------------------|-------|-------|-------');
  console.log(`总计                          | ${String(totalValid).padStart(5)} | ${String(totalInvalid).padStart(5)} |\n`);

  console.log('清理后的无效数据已保存到 *_issues_cleanup.json 文件');
}

main();
