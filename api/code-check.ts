/**
 * C 代码完整性静态校验器（确定性检查，不依赖 AI）
 * 目标：拦截"框架建议式"输出——占位符、未实现函数、结构残缺，
 *       确保交付给用户的代码是完整可编译的实现。
 */

export type CodeIssue = {
  rule: string;
  detail: string;
  severity: "error" | "warn";
};

export type CodeCheckResult = {
  issues: CodeIssue[];
  /** 仅 error 级问题的可读清单（用于修复提示词） */
  errorSummary: string[];
  passed: boolean;
};

/* ---------- 预处理：分离注释/字符串，得到"纯代码" ---------- */
function splitCode(src: string): { code: string; comments: string } {
  let code = "";
  let comments = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (c === "/" && c2 === "/") {
      let j = i;
      while (j < n && src[j] !== "\n") j++;
      comments += src.slice(i, j) + "\n";
      code += " ".repeat(j - i);
      i = j;
    } else if (c === "/" && c2 === "*") {
      let j = i + 2;
      while (j < n && !(src[j] === "*" && src[j + 1] === "/")) j++;
      j = Math.min(j + 2, n);
      comments += src.slice(i, j) + "\n";
      code += src.slice(i, j).replace(/[^\n]/g, " ");
      i = j;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") {
        if (src[j] === "\\") j++;
        j++;
      }
      j = Math.min(j + 1, n);
      code += src.slice(i, j).replace(/[^\n]/g, " ");
      i = j;
    } else {
      code += c;
      i++;
    }
  }
  return { code, comments };
}

/* ---------- 规则 1：占位符/省略标记 ---------- */
const PLACEHOLDER_PATTERNS: [RegExp, string][] = [
  [/\bTODO\b|\bFIXME\b|\bHACK\b/i, "TODO/FIXME 占位标记"],
  [/此处省略|其余省略|以下省略|省略不写|以此类推|不再赘述|参照上文|参见上文|与上文类似|以下类似|类似地配置|同理配置|略去/i, "中文省略表述"],
  [/（\s*略\s*）|\(\s*略\s*\)|（\s*同上\s*）/i, "（略）占位"],
  [/请自行(实现|补充|完善|填写)|由用户(实现|补充)|需要你自己|留给读者/i, "推卸实现责任的表述"],
  [/伪代码|示意代码|仅作示意|不是完整/i, "伪代码/示意声明"],
  [/未实现|未补全|待实现/i, "声明功能未实现"],
  [/简化[,，]?(的|实现|处理|版本|版|版实现)/, "以“简化”替代完整实现"],
  [/实际需要[^，。；\n]*(计算|实现|处理|编写)/, "以“实际需要”措辞推迟实现"],
  [/your code here|implement this|add implementation/i, "英文占位标记"],
];

/* ---------- 规则 4 白名单：C 关键字与常见库/内建 ---------- */
const C_KEYWORDS = new Set([
  "if", "for", "while", "switch", "return", "sizeof", "do", "case", "default",
  "break", "continue", "else", "goto", "typedef", "struct", "union", "enum",
  "static", "const", "volatile", "extern", "inline", "void", "char", "short",
  "int", "long", "float", "double", "signed", "unsigned", "register", "auto",
  "defined", "__attribute__", "interrupt", "sfr", "sbit", "bit", "data",
  "idata", "xdata", "pdata", "code", "reentrant", "using", "restrict",
]);

const LIBC_WHITELIST = new Set([
  // 标准库
  "memset", "memcpy", "memmove", "memcmp", "strlen", "strcpy", "strncpy",
  "strcmp", "strncmp", "strcat", "strchr", "strstr", "sprintf", "snprintf",
  "printf", "puts", "putchar", "getchar", "atoi", "itoa", "abs", "labs",
  "malloc", "free", "calloc", "realloc", "assert", "exit",
  "fabs", "fabsf", "sqrt", "sqrtf", "pow", "powf", "sin", "cos", "tan",
  "floor", "ceil", "round", "fmod", "log", "exp", "isnan", "isinf",
  // ARM CMSIS 内建
  "__disable_irq", "__enable_irq", "__NOP", "__WFI", "__WFE", "__SEV",
  "SysTick_Config", "NVIC_EnableIRQ", "NVIC_DisableIRQ", "NVIC_SetPriority",
  "SystemInit", "SystemCoreClockUpdate", "__set_PRIMASK", "__DSB", "__ISB",
  // 8051 intrins
  "_nop_", "_cror_", "_crol_", "_irol_", "_iror_",
  // FreeRTOS（ESP32）
  "xTaskCreate", "vTaskDelay", "pdMS_TO_TICKS", "xQueueReceive",
  "xQueueSend", "vTaskDelete", "portYIELD_FROM_ISR", "xTaskGetTickCount",
  "ESP_ERROR_CHECK", "esp_err_to_name",
]);

/** 主校验入口 */
export function checkCCode(
  raw: string,
  opts: { peripherals?: string[]; whitelist?: Set<string> } = {},
): CodeCheckResult {
  const issues: CodeIssue[] = [];
  const err = (rule: string, detail: string) =>
    issues.push({ rule, detail, severity: "error" });
  const warn = (rule: string, detail: string) =>
    issues.push({ rule, detail, severity: "warn" });

  const code = (raw ?? "").trim();

  /* 规则 0：代码量下限——完整实现不可能只有几行 */
  if (code.length < 1500) {
    err("代码量", `代码仅 ${code.length} 字符，完整可编译实现不可能如此简短，疑似框架建议`);
  }
  if (code.length < 200) {
    return finish(issues); // 过短无检查意义，直接返回
  }

  const { code: pure, comments } = splitCode(code);

  /* 规则 1：占位符扫描（注释+纯代码双扫） */
  for (const [re, label] of PLACEHOLDER_PATTERNS) {
    const m = comments.match(re) || pure.match(re);
    if (m) {
      err("占位符", `发现${label}：“${m[0]}”，所有函数必须完整实现`);
    }
  }
  // 注释中的省略号（C 变参 ... 只在纯代码中合法）
  const ell = comments.match(/(\.\.\.|……)/);
  if (ell) err("占位符", `注释中含省略号“${ell[1]}”，疑似省略实现`);

  /* 规则 2：括号配平 */
  for (const [open, close, name] of [
    ["{", "}", "大括号"],
    ["(", ")", "圆括号"],
    ["[", "]", "方括号"],
  ] as const) {
    const a = pure.split(open).length - 1;
    const b = pure.split(close).length - 1;
    if (a !== b) err("结构", `${name}不配平：${open}×${a} / ${close}×${b}，代码不完整`);
  }

  /* 规则 3：main 入口 */
  if (!/\b(?:int|void)\s+main\s*\(|\bapp_main\s*\(/.test(pure)) {
    err("结构", "缺少 main()（或 app_main()）入口函数");
  }

  /* 规则 4：函数定义覆盖——所有调用必须有定义或在白名单 */
  const defined = new Set<string>();
  // 函数定义：返回类型 + 名称 + (参数) + {（允许 interrupt 等后缀属性）
  const defRe =
    /^[ \t]*(?:static\s+|inline\s+|extern\s+)*[A-Za-z_][\w\s\*]*?[ \t]([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:interrupt\s+\d+\s*|__attribute__\s*\(\([^)]*\)\)\s*)?\{/gm;
  for (const m of pure.matchAll(defRe)) defined.add(m[1]);
  // 函数原型声明（有声明即可容忍定义在后——但 C 单文件仍需定义，故声明不计入 defined，仅避免误报）
  const protoRe = /^[ \t]*(?:static\s+|extern\s+)*[A-Za-z_][\w\s\*]*?[ \t]([A-Za-z_]\w*)\s*\([^;{}]*\)\s*;/gm;
  const protos = new Set<string>();
  for (const m of pure.matchAll(protoRe)) protos.add(m[1]);
  // 函数式宏
  for (const m of code.matchAll(/^\s*#define\s+([A-Za-z_]\w*)\s*\(/gm)) {
    defined.add(m[1]);
  }

  const called = new Map<string, number>();
  for (const m of pure.matchAll(/(?<![.>\w])([A-Za-z_]\w*)\s*\(/g)) {
    const name = m[1];
    if (C_KEYWORDS.has(name)) continue;
    called.set(name, (called.get(name) ?? 0) + 1);
  }

  const wl = opts.whitelist ?? new Set<string>();
  const undefinedCalls: string[] = [];
  for (const name of called.keys()) {
    if (defined.has(name)) continue;
    if (LIBC_WHITELIST.has(name)) continue;
    if (wl.has(name)) continue;
    if (protos.has(name)) {
      // 有原型无定义——可能是库函数，降级为警告
      warn("定义覆盖", `函数 ${name}() 只有声明没有实现，若为本文件函数需补全`);
      continue;
    }
    undefinedCalls.push(name);
  }
  if (undefinedCalls.length) {
    // 全大写下划线风格通常是 SDK 宏/寄存器操作，降级警告；混合大小写视为缺失实现
    const mixed = undefinedCalls.filter((n) => !/^[A-Z_0-9]+$/.test(n));
    const macroLike = undefinedCalls.filter((n) => /^[A-Z_0-9]+$/.test(n));
    if (mixed.length) {
      err(
        "定义覆盖",
        `以下函数被调用但未实现：${mixed.slice(0, 8).join("、")}${mixed.length > 8 ? ` 等 ${mixed.length} 个` : ""}——必须给出完整实现`,
      );
    }
    if (macroLike.length) {
      warn("定义覆盖", `宏/寄存器操作未定义（应来自芯片头文件）：${macroLike.slice(0, 8).join("、")}`);
    }
  }

  /* 规则 5：外设覆盖——勾选的外设在代码中要有对应实现痕迹 */
  const COVERAGE: [RegExp, RegExp, string][] = [
    [/rs485|rs232|uart|串口|北斗|gps|4g|lora|wifi|蓝牙|ble|nfc/i, /usart|uart|sbuf|串口/i, "串口通信"],
    [/i²c|i2c|eeprom|触摸/i, /i2c|iic|sda|scl|tk_|touch/i, "I2C/触摸"],
    [/spi|显示屏|flash/i, /spi|lcd|oled|tft/i, "SPI/显示"],
    [/adc|模拟采集/i, /adc/i, "ADC 采集"],
    [/pwm|电机|蜂鸣/i, /pwm|ccr|ledc|duty|占空比/i, "PWM"],
    [/can/i, /can/i, "CAN 总线"],
    [/看门狗/i, /wdt|iwdg|wwdg|看门狗/i, "看门狗"],
    [/继电器/i, /relay|继电器/i, "继电器"],
  ];
  for (const [selRe, codeRe, label] of COVERAGE) {
    if ((opts.peripherals ?? []).some((p) => selRe.test(p)) && !codeRe.test(code)) {
      warn("外设覆盖", `已勾选「${label}」但代码中未见对应驱动实现`);
    }
  }

  /* 规则 6：主循环存在 */
  if (!/while\s*\(\s*1\s*\)|for\s*\(\s*;\s*;|while\s*\(\s*true\s*\)/.test(pure) && !/\bapp_main\s*\(/.test(pure)) {
    warn("结构", "未发现主循环 while(1)，请确认固件主框架完整");
  }

  return finish(issues);
}

function finish(issues: CodeIssue[]): CodeCheckResult {
  const errorSummary = issues
    .filter((i) => i.severity === "error")
    .map((i) => `[${i.rule}] ${i.detail}`);
  return { issues, errorSummary, passed: errorSummary.length === 0 };
}
