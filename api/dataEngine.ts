// 数据分析引擎 - 核心统计计算、数据清洗、机器学习预测
// 纯数学实现，不依赖外部库

export type ColumnType = "numeric" | "categorical" | "datetime" | "text";

export function detectColumnType(values: (string | number | null)[]): ColumnType {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) return "text";
  
  const numericCount = nonNull.filter(v => typeof v === "number" || !isNaN(Number(v))).length;
  if (numericCount / nonNull.length > 0.8) return "numeric";
  
  // 检查是否为日期
  const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
  const dateCount = nonNull.filter(v => datePattern.test(String(v))).length;
  if (dateCount / nonNull.length > 0.8) return "datetime";
  
  // 分类数据：唯一值较少
  const uniqueValues = new Set(nonNull.map(v => String(v)));
  if (uniqueValues.size <= Math.min(20, nonNull.length * 0.5)) return "categorical";
  
  return "text";
}

export function getColumnStats(values: (string | number | null)[]) {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== "") as (string | number)[];
  if (nonNull.length === 0) return null;
  
  const numericValues = nonNull
    .map(v => typeof v === "number" ? v : Number(v))
    .filter(v => !isNaN(v));
  
  if (numericValues.length === 0) {
    // 分类统计
    const freq: Record<string, number> = {};
    nonNull.forEach(v => {
      const key = String(v);
      freq[key] = (freq[key] || 0) + 1;
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return {
      type: "categorical" as const,
      count: nonNull.length,
      unique: Object.keys(freq).length,
      top: sorted[0]?.[0] || "",
      freq: sorted[0]?.[1] || 0,
      distribution: sorted.slice(0, 10),
    };
  }
  
  const sorted = [...numericValues].sort((a, b) => a - b);
  const n = numericValues.length;
  const sum = numericValues.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const min = sorted[0];
  const max = sorted[n - 1];
  
  // 中位数
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  
  // 标准差
  const variance = numericValues.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  
  // 四分位数
  const q1Idx = Math.floor(n * 0.25);
  const q3Idx = Math.floor(n * 0.75);
  const q1 = sorted[q1Idx];
  const q3 = sorted[q3Idx];
  const iqr = q3 - q1;
  
  // 偏度
  const skewness = n > 2 
    ? numericValues.reduce((a, b) => a + ((b - mean) / std) ** 3, 0) * n / ((n - 1) * (n - 2))
    : 0;
  
  // 分布直方图数据
  const binCount = Math.min(20, Math.ceil(Math.sqrt(n)));
  const binWidth = (max - min) / binCount || 1;
  const histogram = Array.from({ length: binCount }, (_, i) => ({
    bin: `${(min + i * binWidth).toFixed(2)}-${(min + (i + 1) * binWidth).toFixed(2)}`,
    count: 0,
  }));
  numericValues.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
    histogram[idx].count++;
  });
  
  return {
    type: "numeric" as const,
    count: n,
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    min: Number(min.toFixed(4)),
    max: Number(max.toFixed(4)),
    std: Number(std.toFixed(4)),
    variance: Number(variance.toFixed(4)),
    q1: Number(q1.toFixed(4)),
    q3: Number(q3.toFixed(4)),
    iqr: Number(iqr.toFixed(4)),
    skewness: Number(skewness.toFixed(4)),
    missing: values.length - nonNull.length,
    histogram,
  };
}

// 数据清洗
export function cleanData(
  data: Record<string, (string | number | null)>[],
  columns: string[],
  options: {
    handleMissing?: "delete" | "mean" | "median" | "mode" | "fill";
    fillValue?: string | number;
    handleDuplicate?: boolean;
    handleOutlier?: "none" | "iqr" | "zscore";
    normalizeType?: "none" | "minmax" | "zscore";
  }
) {
  const log: string[] = [];
  let cleaned = [...data];
  
  // 1. 处理重复值
  if (options.handleDuplicate) {
    const before = cleaned.length;
    const seen = new Set<string>();
    cleaned = cleaned.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const removed = before - cleaned.length;
    if (removed > 0) log.push(`删除重复值: ${removed} 行`);
  }
  
  // 2. 处理缺失值
  if (options.handleMissing && options.handleMissing !== "delete") {
    for (const col of columns) {
      const values = cleaned.map(row => row[col]);
      const missingCount = values.filter(v => v === null || v === undefined || v === "").length;
      if (missingCount === 0) continue;
      
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== "") as (string | number)[];
      const numericValues = nonNull.map(v => Number(v)).filter(v => !isNaN(v));
      
      let fillVal: string | number = options.fillValue ?? "";
      
      if (numericValues.length > 0) {
        if (options.handleMissing === "mean") {
          fillVal = Number((numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(4));
        } else if (options.handleMissing === "median") {
          const sorted = [...numericValues].sort((a, b) => a - b);
          fillVal = sorted[Math.floor(sorted.length / 2)];
        } else if (options.handleMissing === "mode") {
          const freq: Record<string, number> = {};
          nonNull.forEach(v => {
            const k = String(v);
            freq[k] = (freq[k] || 0) + 1;
          });
          fillVal = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
        }
        
        cleaned = cleaned.map(row => ({
          ...row,
          [col]: row[col] === null || row[col] === undefined || row[col] === "" ? fillVal : row[col],
        }));
        log.push(`填充缺失值 [${col}]: ${missingCount} 个 -> ${fillVal}`);
      }
    }
  } else if (options.handleMissing === "delete") {
    const before = cleaned.length;
    cleaned = cleaned.filter(row => 
      columns.every(col => row[col] !== null && row[col] !== undefined && row[col] !== "")
    );
    const removed = before - cleaned.length;
    if (removed > 0) log.push(`删除含缺失值行: ${removed} 行`);
  }
  
  // 3. 处理异常值 (IQR 方法)
  if (options.handleOutlier && options.handleOutlier !== "none") {
    for (const col of columns) {
      const values = cleaned.map(row => Number(row[col])).filter(v => !isNaN(v));
      if (values.length < 4) continue;
      
      const sorted = [...values].sort((a, b) => a - b);
      const n = sorted.length;
      const q1 = sorted[Math.floor(n * 0.25)];
      const q3 = sorted[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      
      let outlierCount = 0;
      cleaned = cleaned.map(row => {
        const val = Number(row[col]);
        if (!isNaN(val) && (val < lower || val > upper)) {
          outlierCount++;
          return { ...row, [col]: null };
        }
        return row;
      });
      
      if (outlierCount > 0) {
        log.push(`异常值处理 [${col}]: 标记 ${outlierCount} 个异常值 (IQR: [${lower.toFixed(2)}, ${upper.toFixed(2)}])`);
      }
    }
  }
  
  // 4. 数据标准化
  if (options.normalizeType && options.normalizeType !== "none") {
    for (const col of columns) {
      const values = cleaned.map(row => Number(row[col])).filter(v => !isNaN(v));
      if (values.length === 0) continue;
      
      if (options.normalizeType === "minmax") {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        cleaned = cleaned.map(row => ({
          ...row,
          [col]: !isNaN(Number(row[col])) ? Number(((Number(row[col]) - min) / range).toFixed(4)) : row[col],
        }));
        log.push(`Min-Max 标准化 [${col}]: [${min.toFixed(2)}, ${max.toFixed(2)}] -> [0, 1]`);
      } else if (options.normalizeType === "zscore") {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) || 1;
        cleaned = cleaned.map(row => ({
          ...row,
          [col]: !isNaN(Number(row[col])) ? Number(((Number(row[col]) - mean) / std).toFixed(4)) : row[col],
        }));
        log.push(`Z-Score 标准化 [${col}]: μ=${mean.toFixed(2)}, σ=${std.toFixed(2)}`);
      }
    }
  }
  
  return { data: cleaned, log };
}

// 相关性矩阵
export function correlationMatrix(
  data: Record<string, (string | number | null)>[],
  columns: string[]
) {
  const numericCols = columns.filter(col => {
    const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
    return values.length > data.length * 0.5;
  });
  
  const matrix: Record<string, Record<string, number>> = {};
  
  for (const col1 of numericCols) {
    matrix[col1] = {};
    for (const col2 of numericCols) {
      if (col1 === col2) {
        matrix[col1][col2] = 1;
        continue;
      }
      
      const pairs: [number, number][] = [];
      data.forEach(row => {
        const v1 = Number(row[col1]);
        const v2 = Number(row[col2]);
        if (!isNaN(v1) && !isNaN(v2)) pairs.push([v1, v2]);
      });
      
      if (pairs.length < 2) {
        matrix[col1][col2] = 0;
        continue;
      }
      
      const mean1 = pairs.reduce((a, [v]) => a + v, 0) / pairs.length;
      const mean2 = pairs.reduce((a, [, v]) => a + v, 0) / pairs.length;
      
      let num = 0, den1 = 0, den2 = 0;
      for (const [v1, v2] of pairs) {
        const d1 = v1 - mean1;
        const d2 = v2 - mean2;
        num += d1 * d2;
        den1 += d1 * d1;
        den2 += d2 * d2;
      }
      
      const corr = den1 === 0 || den2 === 0 ? 0 : num / Math.sqrt(den1 * den2);
      matrix[col1][col2] = Number(corr.toFixed(4));
    }
  }
  
  return { columns: numericCols, matrix };
}

// 线性回归预测
export function linearRegression(
  data: Record<string, (string | number | null)>[],
  xCol: string,
  yCol: string,
  predictSteps: number = 5
) {
  const pairs: [number, number][] = [];
  data.forEach(row => {
    const x = Number(row[xCol]);
    const y = Number(row[yCol]);
    if (!isNaN(x) && !isNaN(y)) pairs.push([x, y]);
  });
  
  if (pairs.length < 2) {
    return { error: "Insufficient valid data points (at least 2 required)." };
  }
  
  const n = pairs.length;
  const sumX = pairs.reduce((a, [x]) => a + x, 0);
  const sumY = pairs.reduce((a, [, y]) => a + y, 0);
  const sumXY = pairs.reduce((a, [x, y]) => a + x * y, 0);
  const sumX2 = pairs.reduce((a, [x]) => a + x * x, 0);
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = meanY - slope * meanX;
  
  // R²
  const ssTot = pairs.reduce((a, [, y]) => a + (y - meanY) ** 2, 0);
  const ssRes = pairs.reduce((a, [x, y]) => a + (y - (slope * x + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  
  // MAE
  const mae = pairs.reduce((a, [x, y]) => a + Math.abs(y - (slope * x + intercept)), 0) / n;
  
  // RMSE
  const rmse = Math.sqrt(ssRes / n);
  
  // 预测值和置信区间
  const xValues = pairs.map(([x]) => x).sort((a, b) => a - b);
  const minX = xValues[0];
  const maxX = xValues[xValues.length - 1];
  const step = (maxX - minX) / Math.max(predictSteps - 1, 1);
  
  const predictions = [];
  for (let i = 0; i < predictSteps; i++) {
    const x = minX + step * i;
    const yPred = slope * x + intercept;
    // 95% 置信区间
    const se = Math.sqrt(ssRes / (n - 2)) * Math.sqrt(1 + 1/n + (x - meanX)**2 / (sumX2 - n * meanX**2));
    predictions.push({
      x: Number(x.toFixed(4)),
      y: Number(yPred.toFixed(4)),
      lower: Number((yPred - 1.96 * se).toFixed(4)),
      upper: Number((yPred + 1.96 * se).toFixed(4)),
    });
  }
  
  // 实际值
  const actual = pairs.map(([x, y]) => ({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) }));
  
  return {
    slope: Number(slope.toFixed(6)),
    intercept: Number(intercept.toFixed(6)),
    r2: Number(r2.toFixed(4)),
    mae: Number(mae.toFixed(4)),
    rmse: Number(rmse.toFixed(4)),
    predictions,
    actual,
    equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`,
  };
}

// 趋势预测（时间序列简单移动平均）
export function trendForecast(
  data: Record<string, (string | number | null)>[],
  valueCol: string,
  window: number = 3,
  forecastSteps: number = 5
) {
  const values = data
    .map(row => Number(row[valueCol]))
    .filter(v => !isNaN(v));
  
  if (values.length < window) {
    return { error: `Insufficient data: at least ${window} data points required.` };
  }
  
  // 简单移动平均
  const sma: number[] = [];
  for (let i = window - 1; i < values.length; i++) {
    const windowData = values.slice(i - window + 1, i + 1);
    sma.push(windowData.reduce((a, b) => a + b, 0) / window);
  }
  
  // 预测未来值
  const lastSMA = sma[sma.length - 1];
  const trend = sma.length > 1 ? lastSMA - sma[sma.length - 2] : 0;
  
  const historical = values.map((v, i) => ({ index: i, value: v }));
  
  const forecasts = [];
  let lastValue = lastSMA;
  for (let i = 0; i < forecastSteps; i++) {
    lastValue += trend;
    forecasts.push({
      index: values.length + i,
      value: Number(lastValue.toFixed(4)),
      lower: Number((lastValue * 0.9).toFixed(4)),
      upper: Number((lastValue * 1.1).toFixed(4)),
    });
  }
  
  return {
    historical,
    forecasts,
    trend: Number(trend.toFixed(4)),
    window,
  };
}
