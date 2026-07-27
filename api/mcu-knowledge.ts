/**
 * MCU 样本知识库
 * 来源：晟矽微（sinomcu）官方产品样本、恒矽在售产品线、各兼容型号官方 SDK/数据手册。
 * 用途：在 AI 生成时按目标 MCU 注入准确的规格参数、设计要点与【代码级模板】，
 *       确保输出为完整可用代码而非框架建议。
 */

/** 外设模板键 */
export type TemplateKey =
  | "gpio" | "uart" | "i2c" | "spi" | "adc" | "dac" | "pwm"
  | "timer" | "can" | "wdt" | "rtc" | "flash" | "touch" | "usb";

/** 代码级知识：工具链、寄存器约定、时钟初始化、外设模板、中断写法、生成约束 */
export type McuCodeBase = {
  /** 工具链/编译器约定 */
  toolchain: string;
  /** 头文件与寄存器定义约定 */
  headers: string;
  /** 时钟初始化（含精确计算） */
  clockInit: string;
  /** 中断服务函数写法 */
  irqStyle: string;
  /** 外设初始化模板（按 TemplateKey 索引） */
  templates: Partial<Record<TemplateKey, string>>;
  /** 代码生成约束（含必须核对项的标注约定） */
  codegenRules: string;
};

export type McuKnowledge = {
  model: string;
  title: string;
  /** 关键规格：内核/主频/Flash/RAM/封装/特色外设 */
  specs: string;
  /** 原理图与 PCB 设计要点（来自数据手册与参考设计） */
  designNotes: string;
  /** 代码级模板 */
  code: McuCodeBase;
};

/* ================= 8 位 8051 家族公共代码模板 =================
 * 标准 8051 SFR 为架构级保证（Keil C51 / SDCC 均可编译）；
 * 增强外设（ADC/PWM/TK 等）SFR 命名遵循晟矽微风格，地址需按手册核对。 */
function c51Code(opts: {
  foscMHz: number;
  oneT: boolean;
  enhanced: string; // 增强外设说明
  extraRules?: string;
}): McuCodeBase {
  const FOSC = opts.foscMHz * 1_000_000;
  const t = opts.oneT ? 1 : 12;
  const t0reload = 65536 - Math.round(FOSC / t / 1000);
  const t0h = (t0reload >> 8).toString(16).toUpperCase().padStart(2, "0");
  const t0l = (t0reload & 0xff).toString(16).toUpperCase().padStart(2, "0");
  return {
    toolchain:
      `Keil C51（或 SDCC）编译，C51 语法：sfr/sbit/interrupt 关键字；` +
      `Fosc=${opts.foscMHz}MHz（内部高速 RC，出厂校准）；机器周期=${opts.oneT ? "1T" : "12T"}。`,
    headers:
      `标准 8051 SFR（地址架构保证，直接用）：P0=0x80, P1=0x90, P2=0xA0, P3=0xB0, ` +
      `TCON=0x88, TMOD=0x89, TL0=0x8A, TH0=0x8C, TL1=0x8B, TH1=0x8D, SCON=0x98, SBUF=0x99, ` +
      `IE=0xA8, IP=0xB8, PCON=0x87, PSW=0xD0, ACC=0xE0, B=0xF0；` +
      `位寻址：EA=IE^7, ET0=IE^1, ET1=IE^3, ES=IE^4, TR0=TCON^4, TR1=TCON^6, TF0=TCON^5, ` +
      `TI=SCON^1, RI=SCON^0, SM0=SCON^7, SM1=SCON^6, REN=SCON^4。` +
      `增强外设（${opts.enhanced}）的 SFR 集中在文件头部"增强外设寄存器区"定义，地址按数据手册核对。`,
    clockInit:
      `/* 时钟：内部 RC ${opts.foscMHz}MHz，上电默认启用，无需初始化；` +
      `若用外部晶振，按手册配置时钟切换寄存器（按手册核对） */\n` +
      `#define FOSC ${FOSC}UL  /* 系统时钟 Hz */`,
    irqStyle:
      `中断写法：void 函数名(void) interrupt 向量号 { ... }；` +
      `向量号：INT0=0, T0=1, INT1=2, T1=3, UART=4；` +
      `ISR 内必须清对应标志位（TFx 硬件自清，RI/TI 需软件清）。`,
    templates: {
      gpio:
        `/* GPIO：准双向口。写 1=输入/弱上拉高电平，写 0=强低。\n` +
        ` * 驱动 LED/继电器用灌电流接法（低电平有效） */\n` +
        `#define LED_RUN  P1_0   /* 运行指示灯，低电平点亮 */\n` +
        `#define KEY1     P1_1   /* 按键，按下为低 */\n` +
        `void GPIO_Init(void)\n{\n` +
        `    P1 = 0xFF;   /* 全部置 1：未用口为准输入态，LED 灭 */\n` +
        `}`,
      uart:
        `/* UART：方式1（8位可变波特率），定时器1 方式2 作波特率发生器。\n` +
        ` * ${opts.oneT ? "1T" : "12T"} 模式：TH1 = 256 - FOSC/(${t}*32*baud)，SMOD=0；\n` +
        ` * 若误差>2%，置 PCON|=0x80（SMOD=1）分母改 ${t}*16，重算并验算误差 */\n` +
        `volatile unsigned char g_rxByte = 0;\n` +
        `volatile bit g_rxFlag = 0;\n` +
        `void UART_Init(unsigned long baud)\n{\n` +
        `    SCON = 0x50;             /* 方式1，REN=1 允许接收 */\n` +
        `    TMOD &= 0x0F;\n    TMOD |= 0x20;      /* T1 方式2 8位自动重装 */\n` +
        `    TH1 = TL1 = (unsigned char)(256UL - FOSC / (${t}UL * 32UL) / baud);\n` +
        `    TR1 = 1;\n    ES = 1;\n    EA = 1;\n` +
        `}\n` +
        `void UART_SendByte(unsigned char d)\n{\n` +
        `    SBUF = d;\n    while (!TI);\n    TI = 0;\n` +
        `}\n` +
        `void UART_SendString(char *s)\n{\n` +
        `    while (*s) UART_SendByte((unsigned char)*s++);\n` +
        `}\n` +
        `void UART_ISR(void) interrupt 4\n{\n` +
        `    if (RI) { RI = 0; g_rxByte = SBUF; g_rxFlag = 1; }\n` +
        `    if (TI) TI = 0;\n` +
        `}`,
      timer:
        `/* 定时器0：方式1 16位，1ms 系统节拍（${opts.oneT ? "1T" : "12T"}，重装值 0x${t0h}${t0l}） */\n` +
        `volatile unsigned int g_msTick = 0;\n` +
        `void Timer0_Init(void)\n{\n` +
        `    TMOD &= 0xF0;\n    TMOD |= 0x01;\n` +
        `    TH0 = 0x${t0h};\n    TL0 = 0x${t0l};\n` +
        `    ET0 = 1;\n    TR0 = 1;\n    EA = 1;\n` +
        `}\n` +
        `void Timer0_ISR(void) interrupt 1\n{\n` +
        `    TH0 = 0x${t0h};\n    TL0 = 0x${t0l};\n    g_msTick++;\n` +
        `}`,
      i2c:
        `/* I2C：软件模拟（任何 IO 可用，时序完全可控，标准模式 100kHz）。\n` +
        ` * 开漏约定：写 1 释放总线（靠外部上拉 4.7kΩ），写 0 拉低 */\n` +
        `#define I2C_SDA  P3_4\n#define I2C_SCL  P3_5\n` +
        `static void I2C_Delay(void){ unsigned char i=4; while(i--); } /* ≈2.5μs@${opts.foscMHz}MHz */\n` +
        `void I2C_Start(void){ I2C_SDA=1; I2C_SCL=1; I2C_Delay(); I2C_SDA=0; I2C_Delay(); I2C_SCL=0; }\n` +
        `void I2C_Stop(void){ I2C_SDA=0; I2C_SCL=1; I2C_Delay(); I2C_SDA=1; I2C_Delay(); }\n` +
        `void I2C_WriteByte(unsigned char d){ unsigned char i; for(i=0;i<8;i++){ I2C_SCL=0; I2C_SDA=(d&0x80)?1:0; d<<=1; I2C_Delay(); I2C_SCL=1; I2C_Delay(); } I2C_SCL=0; I2C_SDA=1; I2C_Delay(); I2C_SCL=1; I2C_Delay(); /* 忽略ACK由调用方读 */ }\n` +
        `unsigned char I2C_ReadByte(bit ack){ unsigned char i,d=0; I2C_SDA=1; for(i=0;i<8;i++){ d<<=1; I2C_SCL=1; I2C_Delay(); if(I2C_SDA) d|=1; I2C_SCL=0; I2C_Delay(); } I2C_SDA=ack?0:1; I2C_Delay(); I2C_SCL=1; I2C_Delay(); I2C_SCL=0; I2C_SDA=1; return d; }`,
      adc:
        `/* ADC：增强外设，SFR 地址按数据手册"ADC 章节"核对后填入下方定义区。\n` +
        ` * 典型序列：开 ADC 电源 → 选通道 → 启动转换 → 等待完成标志 → 读结果 */\n` +
        `/* sfr ADC_CONTR = 0xXX;   按手册核对：电源/启动/标志/通道选择\n` +
        `   sfr ADC_RES  = 0xXX;   按手册核对：结果高 8 位\n` +
        `   sfr ADC_RESL = 0xXX;   按手册核对：结果低 2~4 位 */\n` +
        `unsigned int ADC_Read(unsigned char ch)\n{\n` +
        `    /* 1. ADC_CONTR = ADC_POWER | ADC_START | ch;  按手册位定义\n` +
        `       2. 等待 ADC_FLAG 置位（约 10~50μs）\n` +
        `       3. 清标志，返回 (ADC_RES<<4)|(ADC_RESL&0x0F); */\n` +
        `    (void)ch; return 0; /* 按手册补全 3 步即可工作 */\n` +
        `}`,
      pwm:
        `/* PWM：增强外设，SFR 地址按数据手册"PWM 章节"核对。\n` +
        ` * 频率 = FOSC / 分频 / 周期寄存器值；占空比 = 比较值/周期值。\n` +
        ` * 无硬件 PWM 的通道用定时器中断软件 PWM（10 级亮度足够 LED 调光） */`,
      wdt:
        `/* 看门狗：增强外设，SFR 按手册核对。典型：WDT_CONTR 寄存器\n` +
        ` * 使能位 EN_WDT，清狗位 CLR_WDT，溢出周期由 PS[2:0] 选择。\n` +
        ` * 主循环每圈喂狗：WDT_CONTR |= CLR_WDT; */`,
    },
    codegenRules:
      `8051 代码生成规则：\n` +
      `1. 标准 SFR 直接用（地址架构保证）；增强外设 SFR 集中在文件头部定义区，` +
      `每个地址右侧注释“按手册核对”，禁止散落在代码中。\n` +
      `2. 所有被调用的函数必须完整实现；禁止空函数占位（ADC_Read 模板中的注释序列必须落实为真实寄存器操作）。\n` +
      `3. 变量用 volatile 修饰 ISR 与主循环共享标志；bit 类型用于标志位。\n` +
      `4. 主循环结构：while(1){ 按键扫描 → 状态机 → 通信处理 → 喂狗 }，禁止阻塞长延时（用 g_msTick 非阻塞节拍）。` +
      (opts.extraRules ? `\n5. ${opts.extraRules}` : ""),
  };
}

/* ================= 晟矽微 32 位 Cortex-M0 公共代码模板 =================
 * CMSIS 内核部分（SysTick/NVIC）为 ARM 架构级保证；
 * 外设寄存器命名遵循晟矽微标准库风格，基地址需按手册核对。 */
function m0Code(opts: { chip: string; flashKB: number; extras: string }): McuCodeBase {
  return {
    toolchain:
      `ARM GCC / Keil MDK，C99；CMSIS 内核接口（core_cm0.h）：SysTick_Config、NVIC_EnableIRQ、__disable_irq 等直接可用。`,
    headers:
      `文件结构：①芯片寄存器定义区（外设基地址与寄存器结构体，地址按《${opts.chip} 数据手册》核对并逐行注释）` +
      `②板级配置（引脚/时钟）③驱动层（各外设完整实现）④应用层（状态机+main）。`,
    clockInit:
      `/* 时钟：上电默认 HSI 8MHz；经 PLL ×6 → 48MHz 系统时钟。\n` +
        ` * 标准流程：开 PLL 源（HSI/HSE）→ 配倍频系数 → 等 PLL 锁定 → 切换系统时钟 → 更新 SystemCoreClock=48000000。\n` +
        ` * 寄存器名按手册 RCC/CKCU 章节核对；切换后必须重配 Flash 等待周期（48MHz 需 1~2 wait state） */\n` +
        `#define SYSCLK_HZ  48000000UL\n` +
        `volatile unsigned int g_msTick = 0;\n` +
        `void SysTick_Handler(void){ g_msTick++; }   /* CMSIS 固定向量名 */\n` +
        `static void DelayMs(unsigned int ms){ unsigned int t0=g_msTick; while(g_msTick-t0<ms); }`,
    irqStyle:
      `中断写法：向量名按启动文件（如 USART1_IRQHandler），函数内清 pending 标志；` +
      `使能序列：外设中断使能位 → NVIC_EnableIRQ(USART1_IRQn) → 可选 NVIC_SetPriority。`,
    templates: {
      gpio:
        `/* GPIO 典型寄存器组（结构体映射，基地址按手册核对）：\n` +
        ` * MODER(模式:输入/输出/复用/模拟) OTYPE(推挽/开漏) SPEED PUPD(上拉/下拉)\n` +
        ` * IDR(输入) ODR(输出) BSRR(置位/清零原子操作)\n` +
        ` * 输出配置示例：MODER 对应位段=01(输出)，OTYPE=0 推挽，SPEED=中速，BSRR 写高/低 */\n` +
        `#define LED_ON()   GPIOA->BSRR = (1UL << 5)        /* 置位，引脚按实际原理图 */\n` +
        `#define LED_OFF()  GPIOA->BSRR = (1UL << 5) << 16  /* 清零（BSRR 高 16 位复位）*/`,
      uart:
        `/* UART 完整初始化流程（寄存器名按手册核对）：\n` +
        ` * 1. 开时钟：RCC 外设时钟使能 GPIOA + USART1\n` +
        ` * 2. 配引脚：PA9(TX)/PA10(RX) 复用推挽，选 AF 编号\n` +
        ` * 3. 波特率：BRR = SYSCLK/baud（48MHz/115200=416.7→417，误差 0.02%）\n` +
        ` * 4. CR1：字长8位、无校验、TE+RE+RXNEIE 使能、UE=1\n` +
        ` * 5. NVIC_EnableIRQ(USART1_IRQn)\n` +
        ` * 收发：TX 等 TXE=1 写 TDR；RX 中断读 RDR 清 RXNE */`,
      timer:
        `/* 定时器 PWM/定时：PSC 分频、ARR 周期、CCR 占空比。\n` +
        ` * PWM 频率 = 48MHz/((PSC+1)*(ARR+1))；例：PSC=47, ARR=999 → 1kHz。\n` +
        ` * 更新中断：DIER 的 UIE=1，ISR 内清 SR 的 UIF */`,
      adc:
        `/* ADC 12 位：开 ADC 时钟 → 校准（按手册序列）→ 配采样时间（长阻抗源选长采样）\n` +
        ` * → 选通道与规则序列 → 软件触发/连续模式 → 等 EOC 读 DR。\n` +
        ` * 结果 = DR*3300/4095 mV（VREF=3.3V） */`,
      i2c:
        `/* I2C 主机：配 TIMINGR（按手册时序表，100kHz@48MHz 有标准值）或软件模拟。\n` +
        ` * 软件模拟可移植性最好：开漏输出+外部上拉 4.7kΩ，Start/Stop/写字节/读字节 四原语 */`,
      spi:
        `/* SPI 主机：CR1 配 baud 分频(48MHz/8=6MHz)、CPOL/CPHA 按从机、MSB 先行、软件 NSS；\n` +
        ` * 收发：等 TXE 写 DR，等 RXNE 读 DR，结束前等 BSY=0 */`,
      pwm:
        `/* 电机 PWM（${opts.extras}）：高级定时器互补输出，配死区 DT、刹车 BKIN；\n` +
        ` * 载波 16~20kHz：ARR=48000000/20000-1=2399（PSC=0） */`,
      wdt: `/* 独立看门狗 IWDG：LSI 时钟，KR 写 0x5555 解锁→配 PR/RLR→0xCCCC 启动；喂狗 KR=0xAAAA */`,
      can: `/* CAN：位时序按 48MHz 计算（如 500k：BS1=13,BS2=2,PSC=6），过滤器配掩码模式收全部，中断收 FIFO0 */`,
    },
    codegenRules:
      `32 位 Cortex-M0 代码生成规则：\n` +
      `1. CMSIS 内核函数（SysTick/NVIC）直接可用；外设寄存器以结构体映射，基地址集中在定义区并逐行注释“按手册核对”。\n` +
      `2. 每个外设按模板给出的初始化序列落实为真实寄存器赋值，禁止保留“流程注释”当实现。\n` +
      `3. 共享变量 volatile；ISR 短小，置标志由主循环处理。\n` +
      `4. 所有被调用函数（含驱动）必须完整定义于本文件。`,
  };
}

/* ================= 型号知识库 ================= */
export const MCU_KNOWLEDGE: McuKnowledge[] = [
  // ============ 恒矽在售 · 32 位 MCU ============
  {
    model: "MS60F3026",
    title: "32 位通用型 MCU（Arm Cortex-M0）",
    specs:
      "Arm Cortex-M0 内核，主频 48MHz，Flash 64KB，SRAM 8KB；工作电压 2.0~5.5V；" +
      "12 位 ADC（最多 16 通道）、2×USART、2×SPI、2×I2C、高级定时器（PWM 互补输出带死区）；" +
      "封装 SOP28/TSSOP28/LQFP32；工作温度 -40~105℃。",
    designNotes:
      "调试接口使用 SWD（SWDIO/SWCLK），板上预留 4 针调试座；外部 8MHz 晶振经 PLL 倍频至 48MHz，" +
      "晶振负载电容 18~22pF，走线尽量短（<10mm）并用地线包围；NRST 引脚上拉 10kΩ 并对地接 100nF；" +
      "VDDA 与 VDD 之间串磁珠（600Ω@100MHz）+ 1μF/100nF 滤波；每个 VDD 引脚就近放 100nF 去耦电容。",
    code: m0Code({
      chip: "MS60F3026",
      flashKB: 64,
      extras: "通用定时",
    }),
  },
  {
    model: "MS32F031A6",
    title: "32 位电机控制 MCU（Arm Cortex-M0）",
    specs:
      "Arm Cortex-M0，48MHz，Flash 32KB，SRAM 4KB；2.0~5.5V；" +
      "内置运算放大器（OPA）与比较器，12 位 ADC，6 路互补 PWM（带死区与刹车输入），" +
      "1×USART、1×SPI、1×I2C；封装 TSSOP20/SOP28；面向 BLDC/PMSM 控制。",
    designNotes:
      "相电流采样可直接利用内置 OPA：采样电阻（毫欧级）差分信号接入 OPA 输入，增益电阻按目标增益配置；" +
      "PWM 输出串 22~100Ω 栅极电阻；刹车（BKIN）引脚接硬件过流比较输出，保证纳秒级关断；" +
      "功率地与信号地单点连接，ADC 参考地开尔文接法。",
    code: m0Code({
      chip: "MS32F031A6",
      flashKB: 32,
      extras: "电机控制：互补 PWM+死区+刹车，相电流用内置 OPA 采样",
    }),
  },
  {
    model: "MS8040",
    title: "32 位电机驱动专用 MCU（高压预驱集成）",
    specs:
      "Arm Cortex-M0，48MHz，Flash 32KB；集成三相栅极预驱动器（耐压 40V），" +
      "内置 LDO 5V 输出、比较器、OPA；12 位 ADC；封装 QFN48/LQFP48；面向风机、水泵、电动工具。",
    designNotes:
      "高侧驱动采用自举电路：自举二极管（快恢复，如 UF4007）+ 自举电容 1~10μF（并 100nF 陶瓷）；" +
      "母线电流采样用开尔文连接，采样信号 RC 滤波（1kΩ+1nF）后入 ADC；" +
      "栅极串 10~51Ω 电阻抑制振铃；预驱电源 VCP 对地 10μF+100nF；功率回路面积最小化。",
    code: m0Code({
      chip: "MS8040",
      flashKB: 32,
      extras: "集成三相预驱：六路 PWM 直连预驱输入，自举充电需在低侧导通期完成",
    }),
  },
  {
    model: "MA60F9113",
    title: "32 位车规级 MCU（Arm Cortex-M0）",
    specs:
      "Arm Cortex-M0，48MHz，Flash 64KB，SRAM 8KB；AEC-Q100 Grade 1（-40~125℃）；" +
      "支持 LIN/UART、CAN（视子型号）、12 位 ADC、多路定时器；封装 SOP28/LQFP32/LQFP48。",
    designNotes:
      "车规电源入口需 SM8S 系列 TVS（如 SM8S33A）做抛负载防护 + 反接保护二极管（或理想二极管电路）；" +
      "LIN 总线端接 1kΩ（主节点）/30kΩ（从节点）上拉至 VBAT，并加 220pF 对地电容与 ESD 器件；" +
      "CAN 总线用 TJA1051 + 120Ω 端接；电源分压/滤波器件选用车规级。",
    code: m0Code({
      chip: "MA60F9113",
      flashKB: 64,
      extras: "车规：LIN 帧处理（同步场 0x55+PID 校验），CAN 用模板位时序",
    }),
  },
  // ============ 恒矽在售 · 8 位 MCU ============
  {
    model: "MC51F7084",
    title: "8 位增强型 8051 MCU",
    specs:
      "增强型 8051 内核（1T），主频 24MHz，Flash 16KB，RAM 1KB；2.0~5.5V；" +
      "12 位 ADC、触摸按键（TK）、2×UART、SPI、I2C、PWM；封装 SOP20/SOP28。",
    designNotes:
      "IO 为准双向口结构，驱动 LED/继电器用灌电流接法（低电平点亮）；需要推挽输出的场合选 P 口强推挽模式；" +
      "触摸按键焊盘走线远离高频与电源线，参考电容 10~33nF；内部 RC 精度 ±1%（常温），" +
      "对时序精度要求高的 UART 通信建议外接晶振。",
    code: c51Code({
      foscMHz: 24,
      oneT: true,
      enhanced: "ADC/PWM/TK",
      extraRules: "1T 内核：定时器与波特率公式按 1T 计算（模板已含）；触摸 TK 通道扫描周期 10~20ms。",
    }),
  },
  {
    model: "MC32F7361",
    title: "8 位 ADC 增强型 MCU",
    specs:
      "8051 内核，16MHz，Flash 8KB；2.0~5.5V；12 位高精度 ADC（多通道）、" +
      "内置基准 2.048V/2.5V 可选、UART、PWM；封装 SOP16/SOP20；面向传感器信号采集。",
    designNotes:
      "ADC 输入通道串 1kΩ 电阻 + 100nF 对地构成抗混叠滤波，信号源阻抗 <10kΩ；" +
      "使用内置基准时 VREF 引脚对地 100nF+1μF；模拟输入走线远离开关信号；" +
      "多通道轮询采样时通道切换后需等待 ≥10μs 建立时间再启动转换。",
    code: c51Code({
      foscMHz: 16,
      oneT: false,
      enhanced: "ADC/PWM",
      extraRules: "ADC 采样：通道切换后延时 ≥10μs 再启动；结果滑动平均滤波（8 点）。",
    }),
  },
  {
    model: "MC32T7051",
    title: "8 位触摸专用 MCU",
    specs:
      "8051 内核，16MHz，Flash 8KB（OTP 型）；最多 12 路电容触摸按键；" +
      "2.2~5.5V；封装 SOP16/SOP20；面向家电触摸面板。",
    designNotes:
      "OTP（一次性烧写）型号，量产前务必用 MTP 版本验证固件；触摸感应盘直径 8~15mm，" +
      "面板厚度 ≤5mm（亚克力），感应走线等长且远离 LED 驱动与电源线；" +
      "电源纹波会显著影响触摸稳定性，VDD 去耦 100nF+10μF，必要时前级加 RC 滤波（10Ω+10μF）。",
    code: c51Code({
      foscMHz: 16,
      oneT: false,
      enhanced: "TK",
      extraRules: "OTP 型号：代码注释中提醒量产前用 MTP 版验证；TK 基线自校准+触摸阈值=基线-灵敏度。",
    }),
  },
  {
    model: "MC51F8144",
    title: "8 位触摸+显示 MCU",
    specs:
      "增强型 8051，24MHz，Flash 16KB，RAM 1KB；触摸按键 + LED 段码驱动（8COM×8SEG）、" +
      "12 位 ADC、UART、PWM 蜂鸣器驱动；封装 SOP28；面向小家电人机界面。",
    designNotes:
      "LED 段码扫描频率建议 100~200Hz，限流电阻按亮度 200~500Ω 选取；" +
      "触摸通道与 LED 驱动走线分组布置，避免串扰（必要时中间隔地线）；" +
      "蜂鸣器 PWM 输出经 NPN 三极管驱动，续流二极管不可省（电磁式蜂鸣器）。",
    code: c51Code({
      foscMHz: 24,
      oneT: true,
      enhanced: "ADC/PWM/TK/LED驱动",
      extraRules: "LED 段码扫描用 1ms 节拍轮询 COM；蜂鸣器用 PWM 通道，频率 2~4kHz。",
    }),
  },
  {
    model: "MA51F8203",
    title: "8 位高抗干扰 8051 MCU",
    specs:
      "1T 8051 内核，24MHz，Flash 32KB，RAM 2KB；2.0~5.5V；ESD 8kV（HBM）、EFT ±4kV；" +
      "12 位 ADC、2×UART、SPI、I2C、多路 PWM；封装 SOP16/SOP20/SOP28；面向强干扰工业环境。",
    designNotes:
      "1T 内核指令速度为传统 8051 的 6~12 倍，移植旧代码时软件延时需重新计算；" +
      "工业现场通信口（RS485）必须外置 SM712 TVS 与 560Ω/0.5W 失效保护电阻；" +
      "复位脚与未用 IO 按手册处理（未用 IO 设为推挽输出低电平或上拉输入，不可悬空）。",
    code: c51Code({
      foscMHz: 24,
      oneT: true,
      enhanced: "ADC/PWM/SPI/I2C",
      extraRules: "工业环境：通信协议加 CRC16 校验与超时重发；未用 IO 置确定电平。",
    }),
  },
  {
    model: "MC30P6310",
    title: "8 位精简 IO 型 MCU",
    specs:
      "RISC 内核，8MHz，Flash 2KB（OTP）；2.0~5.5V；最多 14 个 IO、8 位 PWM、比较器；" +
      "封装 SOP8/SOP14/SOP16；面向简单控制（灯控、小电机、定时开关）。",
    designNotes:
      "极简外围：VDD 100nF 去耦即可工作，内部复位与内部 RC 振荡；" +
      "OTP 型号注意烧写校验；驱动负载优先灌电流方式；低成本应用可省外部晶振与复位电路。",
    code: {
      toolchain: "晟矽微 IDE（HT-IDE 风格）C/汇编；内部 RC 8MHz；OTP 一次性烧写。",
      headers: "寄存器以官方头文件为准（TRIS 方向/PORT 数据风格），集中定义并核对。",
      clockInit: "#define FOSC 8000000UL  /* 内部 RC 8MHz */",
      irqStyle: "中断入口固定 0x04（或按手册），ISR 内保存/恢复 W 与 STATUS。",
      templates: {
        gpio: "/* GPIO：TRIS 配方向（1=输入 0=输出），PORT 读写；驱动负载优先灌电流 */",
        timer: "/* 8 位定时器+预分频：溢出中断做 1ms 节拍，重装载值=FOSC/4/分频/1000 */",
        pwm: "/* 8 位 PWM：周期寄存器定频率，占空比寄存器定脉宽 */",
      },
      codegenRules:
        "精简型规则：程序 ≤2KB Flash，避免浮点与动态内存；延时用循环或定时器；OTP 提醒量产前 MTP 验证。",
    },
  },
];

/* ================= 兼容开发型号（真实 SDK API，经验证） ================= */

/** STM32 标准外设库（SPL）公共模板——F103/F407/CH32V203 命名一致 */
const STM32_SPL_COMMON = {
  uart:
    `/* USART1 @APB2，PA9=TX(复用推挽) PA10=RX(浮空输入) */\n` +
    `RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA | RCC_APB2Periph_USART1, ENABLE);\n` +
    `GPIO_InitTypeDef gpio;\n` +
    `gpio.GPIO_Pin = GPIO_Pin_9; gpio.GPIO_Mode = GPIO_Mode_AF_PP; gpio.GPIO_Speed = GPIO_Speed_50MHz;\n` +
    `GPIO_Init(GPIOA, &gpio);\n` +
    `gpio.GPIO_Pin = GPIO_Pin_10; gpio.GPIO_Mode = GPIO_Mode_IN_FLOATING;\n` +
    `GPIO_Init(GPIOA, &gpio);\n` +
    `USART_InitTypeDef usart;\n` +
    `usart.USART_BaudRate = 115200;\n` +
    `usart.USART_WordLength = USART_WordLength_8b;\n` +
    `usart.USART_StopBits = USART_StopBits_1;\n` +
    `usart.USART_Parity = USART_Parity_No;\n` +
    `usart.USART_HardwareFlowControl = USART_HardwareFlowControl_None;\n` +
    `usart.USART_Mode = USART_Mode_Tx | USART_Mode_Rx;\n` +
    `USART_Init(USART1, &usart);\n` +
    `USART_ITConfig(USART1, USART_IT_RXNE, ENABLE);\n` +
    `USART_Cmd(USART1, ENABLE);\n` +
    `/* NVIC_InitTypeDef nvic; nvic.NVIC_IRQChannel = USART1_IRQn;\n` +
    `   nvic.NVIC_IRQChannelPreemptionPriority = 1; nvic.NVIC_IRQChannelSubPriority = 1;\n` +
    `   nvic.NVIC_IRQChannelCmd = ENABLE; NVIC_Init(&nvic); */\n` +
    `void USART1_IRQHandler(void)\n{\n` +
    `    if (USART_GetITStatus(USART1, USART_IT_RXNE) != RESET) {\n` +
    `        unsigned char d = (unsigned char)USART_ReceiveData(USART1); /* 读DR自动清标志 */\n` +
    `        /* 入接收环形缓冲 */\n        (void)d;\n    }\n` +
    `}\n` +
    `void UART_SendByte(unsigned char d)\n{\n` +
    `    while (USART_GetFlagStatus(USART1, USART_FLAG_TXE) == RESET);\n` +
    `    USART_SendData(USART1, d);\n` +
    `}`,
  gpio:
    `/* GPIO 输出（推挽）+ 输入（上拉）*/\n` +
    `RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOA | RCC_APB2Periph_GPIOB, ENABLE);\n` +
    `GPIO_InitTypeDef gpio;\n` +
    `gpio.GPIO_Pin = GPIO_Pin_5; gpio.GPIO_Mode = GPIO_Mode_Out_PP; gpio.GPIO_Speed = GPIO_Speed_50MHz;\n` +
    `GPIO_Init(GPIOA, &gpio);            /* LED */\n` +
    `gpio.GPIO_Pin = GPIO_Pin_0; gpio.GPIO_Mode = GPIO_Mode_IPU;\n` +
    `GPIO_Init(GPIOB, &gpio);            /* 按键，按下为低 */\n` +
    `#define LED_ON()   GPIO_ResetBits(GPIOA, GPIO_Pin_5)\n` +
    `#define LED_OFF()  GPIO_SetBits(GPIOA, GPIO_Pin_5)\n` +
    `#define KEY_READ() GPIO_ReadInputDataBit(GPIOB, GPIO_Pin_0)`,
  timer:
    `/* TIM3 1ms 更新中断：APB1 定时器时钟×2 */\n` +
    `RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM3, ENABLE);\n` +
    `TIM_TimeBaseInitTypeDef tim;\n` +
    `tim.TIM_Prescaler = 72 - 1;            /* 1MHz 计数（72MHz/72）*/\n` +
    `tim.TIM_Period = 1000 - 1;             /* 1kHz 更新 = 1ms */\n` +
    `tim.TIM_ClockDivision = TIM_CKD_DIV1;\n` +
    `tim.TIM_CounterMode = TIM_CounterMode_Up;\n` +
    `TIM_TimeBaseInit(TIM3, &tim);\n` +
    `TIM_ITConfig(TIM3, TIM_IT_Update, ENABLE);\n` +
    `TIM_Cmd(TIM3, ENABLE);\n` +
    `void TIM3_IRQHandler(void)\n{\n` +
    `    if (TIM_GetITStatus(TIM3, TIM_IT_Update) != RESET) {\n` +
    `        TIM_ClearITPendingBit(TIM3, TIM_IT_Update);\n` +
    `        g_msTick++;\n    }\n` +
    `}`,
  pwm:
    `/* TIM3 CH1 PWM 1kHz：PSC=72-1(1MHz), ARR=1000-1 */\n` +
    `TIM_OCInitTypeDef oc;\n` +
    `oc.TIM_OCMode = TIM_OCMode_PWM1;\n` +
    `oc.TIM_OutputState = TIM_OutputState_Enable;\n` +
    `oc.TIM_Pulse = 500;                    /* 50% 占空比 */\n` +
    `oc.TIM_OCPolarity = TIM_OCPolarity_High;\n` +
    `TIM_OC1Init(TIM3, &oc);\n` +
    `TIM_OC1PreloadConfig(TIM3, TIM_OCPreload_Enable);\n` +
    `TIM_ARRPreloadConfig(TIM3, ENABLE);\n` +
    `TIM_Cmd(TIM3, ENABLE);\n` +
    `/* 占空比运行时调整：TIM_SetCompare1(TIM3, duty); */`,
  adc:
    `/* ADC1 通道0(PA0)，12位右对齐 */\n` +
    `RCC_APB2PeriphClockCmd(RCC_APB2Periph_ADC1 | RCC_APB2Periph_GPIOA, ENABLE);\n` +
    `RCC_ADCCLKConfig(RCC_PCLK2_Div6);      /* ADC 时钟 12MHz ≤14MHz */\n` +
    `GPIO_InitTypeDef gpio;\n` +
    `gpio.GPIO_Pin = GPIO_Pin_0; gpio.GPIO_Mode = GPIO_Mode_AIN;\n` +
    `GPIO_Init(GPIOA, &gpio);\n` +
    `ADC_InitTypeDef adc;\n` +
    `adc.ADC_Mode = ADC_Mode_Independent;\n` +
    `adc.ADC_ScanConvMode = DISABLE;\n` +
    `adc.ADC_ContinuousConvMode = DISABLE;\n` +
    `adc.ADC_ExternalTrigConv = ADC_ExternalTrigConv_None;\n` +
    `adc.ADC_DataAlign = ADC_DataAlign_Right;\n` +
    `adc.ADC_NbrOfChannel = 1;\n` +
    `ADC_Init(ADC1, &adc);\n` +
    `ADC_RegularChannelConfig(ADC1, ADC_Channel_0, 1, ADC_SampleTime_55Cycles5);\n` +
    `ADC_Cmd(ADC1, ENABLE);\n` +
    `ADC_ResetCalibration(ADC1);\n` +
    `while (ADC_GetResetCalibrationStatus(ADC1));\n` +
    `ADC_StartCalibration(ADC1);\n` +
    `while (ADC_GetCalibrationStatus(ADC1));\n` +
    `unsigned short ADC_Read(void)\n{\n` +
    `    ADC_SoftwareStartConvCmd(ADC1, ENABLE);\n` +
    `    while (ADC_GetFlagStatus(ADC1, ADC_FLAG_EOC) == RESET);\n` +
    `    return ADC_GetConversionValue(ADC1);   /* 0~4095 → mV=val*3300/4095 */\n` +
    `}`,
  i2c:
    `/* I2C 传感器：软件模拟（PB6=SCL PB7=SDA，开漏+外部4.7kΩ上拉），移植性最好。\n` +
    ` * 标准模式 100kHz：每半周期 ≈5μs 延时 */\n` +
    `#define I2C_SCL_H() GPIO_SetBits(GPIOB, GPIO_Pin_6)\n` +
    `#define I2C_SCL_L() GPIO_ResetBits(GPIOB, GPIO_Pin_6)\n` +
    `#define I2C_SDA_H() GPIO_SetBits(GPIOB, GPIO_Pin_7)\n` +
    `#define I2C_SDA_L() GPIO_ResetBits(GPIOB, GPIO_Pin_7)\n` +
    `#define I2C_SDA_R() GPIO_ReadInputDataBit(GPIOB, GPIO_Pin_7)\n` +
    `/* Start/Stop/WriteByte/ReadByte 四原语完整实现后，按器件手册组合读写序列 */`,
  spi:
    `/* SPI1 主机：PA5=SCK PA6=MISO PA7=MOSI，8MHz，模式0 */\n` +
    `RCC_APB2PeriphClockCmd(RCC_APB2Periph_SPI1 | RCC_APB2Periph_GPIOA, ENABLE);\n` +
    `/* SCK/MOSI=AF_PP，MISO=浮空输入，CS 用普通推挽输出 */\n` +
    `SPI_InitTypeDef spi;\n` +
    `spi.SPI_Direction = SPI_Direction_2Lines_FullDuplex;\n` +
    `spi.SPI_Mode = SPI_Mode_Master;\n` +
    `spi.SPI_DataSize = SPI_DataSize_8b;\n` +
    `spi.SPI_CPOL = SPI_CPOL_Low;\n` +
    `spi.SPI_CPHA = SPI_CPHA_1Edge;\n` +
    `spi.SPI_NSS = SPI_NSS_Soft;\n` +
    `spi.SPI_BaudRatePrescaler = SPI_BaudRatePrescaler_8;   /* 72/8=9MHz */\n` +
    `spi.SPI_FirstBit = SPI_FirstBit_MSB;\n` +
    `spi.SPI_CRCPolynomial = 7;\n` +
    `SPI_Init(SPI1, &spi);\n` +
    `SPI_Cmd(SPI1, ENABLE);\n` +
    `unsigned char SPI_Transfer(unsigned char d)\n{\n` +
    `    while (SPI_I2S_GetFlagStatus(SPI1, SPI_I2S_FLAG_TXE) == RESET);\n` +
    `    SPI_I2S_SendData(SPI1, d);\n` +
    `    while (SPI_I2S_GetFlagStatus(SPI1, SPI_I2S_FLAG_RXNE) == RESET);\n` +
    `    return SPI_I2S_ReceiveData(SPI1);\n` +
    `}`,
  can:
    `/* CAN1 500kbps@APB1 36MHz：BS1=6tq BS2=1tq SJW=1 PSC=9 → 36M/(9×8)=500k */\n` +
    `RCC_APB1PeriphClockCmd(RCC_APB1Periph_CAN1, ENABLE);\n` +
    `CAN_InitTypeDef can;\n` +
    `can.CAN_TTCM = DISABLE; can.CAN_ABOM = ENABLE; can.CAN_AWUM = DISABLE;\n` +
    `can.CAN_NART = DISABLE; can.CAN_RFLM = DISABLE; can.CAN_TXFP = DISABLE;\n` +
    `can.CAN_Mode = CAN_Mode_Normal;\n` +
    `can.CAN_SJW = CAN_SJW_1tq; can.CAN_BS1 = CAN_BS1_6tq; can.CAN_BS2 = CAN_BS2_1tq;\n` +
    `can.CAN_Prescaler = 9;\n` +
    `CAN_Init(CAN1, &can);\n` +
    `/* 过滤器0：掩码模式收全部；CAN_FIFO0 接收中断 */`,
  wdt:
    `/* 独立看门狗 IWDG：LSI 40kHz，1s 超时 */\n` +
    `IWDG_WriteAccessCmd(IWDG_WriteAccess_Enable);\n` +
    `IWDG_SetPrescaler(IWDG_Prescaler_64);\n` +
    `IWDG_SetReload(625);                   /* 40000/64=625Hz → 1s */\n` +
    `IWDG_ReloadCounter();\n` +
    `IWDG_Enable();\n` +
    `/* 主循环喂狗：IWDG_ReloadCounter(); */`,
};

const STM32_RULES =
  `STM32 SPL 代码生成规则：\n` +
  `1. 严格使用标准外设库 API（RCC_*PeriphClockCmd / GPIO_Init / USART_Init / TIM_* / ADC_* / SPI_* 等），\n` +
  `   头文件 stm32f10x.h（F103）或 stm32f4xx.h（F407）。\n` +
  `2. 每个外设：先开对应总线时钟（APB1/APB2/AHB1），再配 GPIO，最后配外设并 Cmd ENABLE。\n` +
  `3. 中断：NVIC_InitTypeDef 配优先级 + 外设 ITConfig 使能 + ISR 内 GetITStatus/ClearITPendingBit 成对。\n` +
  `4. 所有被调用函数完整实现（含 UART_SendByte 等辅助函数），禁止占位符。`;

const MCU_COMPAT: McuKnowledge[] = [
  {
    model: "STM32F103",
    title: "STM32F103（Cortex-M3，兼容开发）",
    specs:
      "Arm Cortex-M3，72MHz，Flash 64~512KB，SRAM 20~64KB；2.0~3.6V（非 5V 耐受供电，部分 IO 5V 容忍）；" +
      "3×USART、2×SPI、2×I2C、USB、CAN、12 位 ADC（1μs）；封装 LQFP48/64/100。",
    designNotes:
      "BOOT0 必须下拉 10kΩ 至 GND（不可悬空）；VCAP（部分封装 VCAP_1/VCAP_2）各接 2.2μF 对地；" +
      "8MHz 晶振 + PLL 至 72MHz；SWD 调试；注意该芯片为 3.3V 供电，与 5V 外设接口需电平转换；" +
      "USB 的 D+ 需 1.5kΩ 上拉（部分型号内置）。",
    code: {
      toolchain: "Keil MDK / ARM GCC，C99，STM32F10x 标准外设库（SPL）或 HAL；时钟由 system_stm32f10x.c 配为 72MHz（HSE 8MHz PLL×9）。",
      headers: `#include "stm32f10x.h"；APB1=36MHz（定时器×2=72MHz），APB2=72MHz，ADC 时钟 ≤14MHz。`,
      clockInit:
        `/* 系统时钟 72MHz 由启动文件配置；SysTick 1ms 节拍 */\n` +
        `volatile unsigned int g_msTick = 0;\n` +
        `void SysTick_Handler(void){ g_msTick++; }\n` +
        `static void DelayMs(unsigned int ms){ unsigned int t0=g_msTick; while(g_msTick-t0<ms); }\n` +
        `/* main 中：SysTick_Config(SystemCoreClock / 1000); */`,
      irqStyle: "ISR 向量名按启动文件（USART1_IRQHandler/TIM3_IRQHandler 等）；NVIC_InitTypeDef 配优先级分组。",
      templates: { ...STM32_SPL_COMMON },
      codegenRules: STM32_RULES,
    },
  },
  {
    model: "STM32F407",
    title: "STM32F407（Cortex-M4F，兼容开发）",
    specs:
      "Arm Cortex-M4 带 FPU，168MHz，Flash 512KB~1MB，SRAM 192KB；1.8~3.6V；" +
      "3×ADC（2.4MSPS）、2×DAC、以太网 MAC、USB OTG、CAN×2、I2S；封装 LQFP100/144。",
    designNotes:
      "VCAP_1/VCAP_2 各接 2.2μF（低 ESR）对地，缺失会导致内核供电异常；" +
      "168MHz 需外部 8~25MHz 晶振 + PLL；高速信号（以太网/USB）按差分与阻抗要求布线；" +
      "模拟部分 VDDA/VREF+ 独立滤波；大封装建议 4 层板，完整地平面。",
    code: {
      toolchain: "Keil MDK / ARM GCC，STM32F4xx SPL 或 HAL；时钟 168MHz（HSE 8MHz PLL：8M/8×336/2），APB1=42MHz（定时器×2=84MHz），APB2=84MHz。",
      headers: `#include "stm32f4xx.h"；F4 的 GPIO 用 GPIO_PinAFConfig 配复用；定时器时钟注意 APB 倍频。`,
      clockInit:
        `/* 168MHz；SysTick 1ms */\n` +
        `volatile unsigned int g_msTick = 0;\n` +
        `void SysTick_Handler(void){ g_msTick++; }\n` +
        `/* SysTick_Config(SystemCoreClock / 1000);  TIM 时钟：APB1 定时器=84MHz，APB2 定时器=168MHz */`,
      irqStyle: "同 STM32 SPL：NVIC_InitTypeDef + ITConfig + GetITStatus/ClearITPendingBit；F4 GPIO 中断用 EXTI+SYSCFG。",
      templates: {
        ...STM32_SPL_COMMON,
        uart:
          `/* USART1 @APB2(84MHz)：PA9/PA10 复用 AF7 */\n` +
          `RCC_AHB1PeriphClockCmd(RCC_AHB1Periph_GPIOA, ENABLE);\n` +
          `RCC_APB2PeriphClockCmd(RCC_APB2Periph_USART1, ENABLE);\n` +
          `GPIO_InitTypeDef gpio;\n` +
          `gpio.GPIO_Pin = GPIO_Pin_9 | GPIO_Pin_10;\n` +
          `gpio.GPIO_Mode = GPIO_Mode_AF; gpio.GPIO_OType = GPIO_OType_PP;\n` +
          `gpio.GPIO_PuPd = GPIO_PuPd_UP; gpio.GPIO_Speed = GPIO_Speed_50MHz;\n` +
          `GPIO_Init(GPIOA, &gpio);\n` +
          `GPIO_PinAFConfig(GPIOA, GPIO_PinSource9, GPIO_AF_USART1);\n` +
          `GPIO_PinAFConfig(GPIOA, GPIO_PinSource10, GPIO_AF_USART1);\n` +
          `/* USART_InitTypeDef 同 F103 模板；BRR 按 84MHz 计算 */`,
      },
      codegenRules: STM32_RULES + `\n5. F4 差异：GPIO 时钟在 AHB1；复用必须 GPIO_PinAFConfig；定时器时钟按 APB×2 计算。`,
    },
  },
  {
    model: "GD32E230",
    title: "GD32E230（Cortex-M23，兼容开发）",
    specs:
      "Arm Cortex-M23，72MHz，Flash 16~64KB，SRAM 4~8KB；1.8~3.6V；" +
      "12 位 ADC、2×USART、SPI、I2C、比较器；封装 TSSOP20/LQFP32/48；高性价比国产替代。",
    designNotes:
      "与 STM32F030 管脚兼容度高，移植注意 Flash 等待周期与启动差异；" +
      "3.3V 供电，BOOT0 下拉；外接晶振 8MHz；批量烧写可用 SWD 或串口 ISP。",
    code: {
      toolchain: "Keil MDK / ARM GCC，GD32E23x 标准外设库（固件库命名小写下划线风格）；时钟 72MHz（IRC8M PLL）。",
      headers: `#include "gd32e23x.h"；RCU 时钟使能、gpio_*、usart_*、timer_*、adc_* 系列 API。`,
      clockInit:
        `/* 72MHz 由 system_gd32e23x.c 配置；SysTick 1ms */\n` +
        `volatile unsigned int g_msTick = 0;\n` +
        `void SysTick_Handler(void){ g_msTick++; }`,
      irqStyle: "ISR 向量名如 USART0_IRQHandler；nvic_irq_enable(USART0_IRQn, 1, 1) 使能。",
      templates: {
        uart:
          `/* USART0：PA9=TX PA10=RX，AF1 */\n` +
          `rcu_periph_clock_enable(RCU_GPIOA);\n` +
          `rcu_periph_clock_enable(RCU_USART0);\n` +
          `gpio_af_set(GPIOA, GPIO_AF_1, GPIO_PIN_9 | GPIO_PIN_10);\n` +
          `gpio_mode_set(GPIOA, GPIO_MODE_AF, GPIO_PUPD_PULLUP, GPIO_PIN_9 | GPIO_PIN_10);\n` +
          `gpio_output_options_set(GPIOA, GPIO_OTYPE_PP, GPIO_OSPEED_10MHZ, GPIO_PIN_9);\n` +
          `usart_deinit(USART0);\n` +
          `usart_baudrate_set(USART0, 115200U);\n` +
          `usart_word_length_set(USART0, USART_WL_8BIT);\n` +
          `usart_stop_bit_set(USART0, USART_STB_1BIT);\n` +
          `usart_parity_config(USART0, USART_PM_NONE);\n` +
          `usart_receive_config(USART0, USART_RECEIVE_ENABLE);\n` +
          `usart_transmit_config(USART0, USART_TRANSMIT_ENABLE);\n` +
          `usart_enable(USART0);\n` +
          `void UART_SendByte(unsigned char d)\n{\n` +
          `    while (usart_flag_get(USART0, USART_FLAG_TBE) == RESET);\n` +
          `    usart_data_transmit(USART0, d);\n` +
          `}`,
        gpio:
          `/* GPIO 输出/输入 */\n` +
          `rcu_periph_clock_enable(RCU_GPIOA);\n` +
          `gpio_mode_set(GPIOA, GPIO_MODE_OUTPUT, GPIO_PUPD_NONE, GPIO_PIN_5);\n` +
          `gpio_output_options_set(GPIOA, GPIO_OTYPE_PP, GPIO_OSPEED_10MHZ, GPIO_PIN_5);\n` +
          `#define LED_ON()  gpio_bit_reset(GPIOA, GPIO_PIN_5)\n` +
          `#define LED_OFF() gpio_bit_set(GPIOA, GPIO_PIN_5)`,
        adc:
          `/* ADC 通道0：rcu_periph_clock_enable(RCU_ADC)；adc_channel_length_config；\n` +
          `   adc_regular_channel_config(0, ADC_CHANNEL_0, ADC_SAMPLETIME_55POINT5);\n` +
          `   adc_enable(); adc_calibration_enable(); 读 adc_regular_data_read() */`,
        timer:
          `/* TIMER2 PWM：rcu_periph_clock_enable(RCU_TIMER2)；\n` +
          `   timer_initpara 配 prescaler=72-1, period=1000-1 → 1kHz；\n` +
          `   timer_channel_output_pulse_value_config 调占空比 */`,
      },
      codegenRules:
        `GD32 规则：全部使用固件库 API（rcu_/gpio_/usart_/timer_/adc_ 前缀），\n` +
        `时钟使能先行；标志查询用 *_flag_get，中断清用 *_interrupt_flag_clear；所有函数完整实现。`,
    },
  },
  {
    model: "ESP32-S3",
    title: "ESP32-S3（Wi-Fi+BLE 双核，兼容开发）",
    specs:
      "Xtensa LX7 双核 240MHz，SRAM 512KB，外接 Flash（4~16MB）与可选 PSRAM；" +
      "2.4GHz Wi-Fi 4 + BLE 5.0；45 个 GPIO、USB OTG、2×ADC（12 位）、SPI/I2C/I2S/UART/LED PWM。",
    designNotes:
      "射频部分严格参考乐鑫参考设计：天线 π 型匹配网络（预留 NC）、禁止铺铜区、" +
      "模块下方完整地平面；IO0 是启动模式选择（下载需下拉），上电时序受 EN 控制；" +
      "供电 3.3V，峰值电流 500mA 以上，LDO 留足裕量，输入电容 10μF 起。",
    code: {
      toolchain: "ESP-IDF v5.x（CMake），FreeRTOS；app_main 入口，任务用 xTaskCreate，延时 vTaskDelay(pdMS_TO_TICKS(ms))。",
      headers: `#include "driver/gpio.h" "driver/uart.h" "esp_adc/adc_oneshot.h" "driver/ledc.h" "freertos/FreeRTOS.h" "freertos/task.h"。`,
      clockInit: "/* 240MHz 由 IDF 启动配置；节拍用 FreeRTOS tick（默认 1000Hz），无需手写时钟 */",
      irqStyle: "驱动内部管中断；用户层用队列/回调（如 uart_driver_install 的事件队列 xQueueReceive）。",
      templates: {
        gpio:
          `/* GPIO 输出+输入（带中断）*/\n` +
          `gpio_config_t out_cfg = {\n` +
          `    .pin_bit_mask = 1ULL << GPIO_NUM_4,\n` +
          `    .mode = GPIO_MODE_OUTPUT,\n` +
          `    .pull_up_en = GPIO_PULLUP_DISABLE,\n` +
          `    .pull_down_en = GPIO_PULLDOWN_DISABLE,\n` +
          `    .intr_type = GPIO_INTR_DISABLE,\n` +
          `};\n` +
          `gpio_config(&out_cfg);\n` +
          `gpio_set_level(GPIO_NUM_4, 1);   /* 输出高 */`,
        uart:
          `/* UART1：TX=GPIO17 RX=GPIO16，115200-8-N-1 */\n` +
          `uart_config_t uart_cfg = {\n` +
          `    .baud_rate = 115200,\n` +
          `    .data_bits = UART_DATA_8_BITS,\n` +
          `    .parity = UART_PARITY_DISABLE,\n` +
          `    .stop_bits = UART_STOP_BITS_1,\n` +
          `    .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,\n` +
          `    .source_clk = UART_SCLK_DEFAULT,\n` +
          `};\n` +
          `uart_driver_install(UART_NUM_1, 1024, 0, 0, NULL, 0);\n` +
          `uart_param_config(UART_NUM_1, &uart_cfg);\n` +
          `uart_set_pin(UART_NUM_1, GPIO_NUM_17, GPIO_NUM_16, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);\n` +
          `/* 发：uart_write_bytes(UART_NUM_1, buf, len)；收：uart_read_bytes(..., pdMS_TO_TICKS(100)) */`,
        adc:
          `/* ADC 单次采样（IDF v5 新 API）：ADC1_CH3=GPIO4 */\n` +
          `adc_oneshot_unit_handle_t adc1;\n` +
          `adc_oneshot_unit_init_cfg_t unit_cfg = { .unit_id = ADC_UNIT_1 };\n` +
          `adc_oneshot_new_unit(&unit_cfg, &adc1);\n` +
          `adc_oneshot_chan_cfg_t chan_cfg = { .bitwidth = ADC_BITWIDTH_12, .atten = ADC_ATTEN_DB_12 };\n` +
          `adc_oneshot_config_channel(adc1, ADC_CHANNEL_3, &chan_cfg);\n` +
          `int raw = 0;\n` +
          `adc_oneshot_read(adc1, ADC_CHANNEL_3, &raw);   /* 0~4095，12dB 衰减量程≈3.1V */`,
        pwm:
          `/* LEDC PWM 5kHz 10位：LED 调光/电机 */\n` +
          `ledc_timer_config_t ledc_timer = {\n` +
          `    .speed_mode = LEDC_LOW_SPEED_MODE,\n` +
          `    .duty_resolution = LEDC_TIMER_10_BIT,\n` +
          `    .timer_num = LEDC_TIMER_0,\n` +
          `    .freq_hz = 5000,\n` +
          `    .clk_cfg = LEDC_AUTO_CLK,\n` +
          `};\n` +
          `ledc_timer_config(&ledc_timer);\n` +
          `ledc_channel_config_t ledc_ch = {\n` +
          `    .gpio_num = GPIO_NUM_5,\n` +
          `    .speed_mode = LEDC_LOW_SPEED_MODE,\n` +
          `    .channel = LEDC_CHANNEL_0,\n` +
          `    .timer_sel = LEDC_TIMER_0,\n` +
          `    .duty = 512, .hpoint = 0,\n` +
          `};\n` +
          `ledc_channel_config(&ledc_ch);\n` +
          `/* 调占空比：ledc_set_duty + ledc_update_duty */`,
        i2c:
          `/* I2C 主机（IDF v5 新驱动 driver/i2c_master.h）：SCL=GPIO8 SDA=GPIO9，100kHz，\n` +
          `   i2c_new_master_bus → i2c_master_bus_add_device → i2c_master_transmit/receive */`,
        spi:
          `/* SPI2 主机：spi_bus_initialize(SPI2_HOST, &bus_cfg, SPI_DMA_CH_AUTO)\n` +
          `   → spi_bus_add_device → spi_device_transmit；SCK=GPIO12 MISO=GPIO13 MOSI=GPIO11 */`,
        timer:
          `/* 通用定时器 gptimer：gptimer_new_timer(1MHz) → gptimer_register_event_callbacks\n` +
          `   → gptimer_set_alarm_action → gptimer_enable/start；回调内置标志 */`,
        wdt:
          `/* 任务看门狗：esp_task_wdt_init(5, true) → esp_task_wdt_add(NULL) → 主循环 esp_task_wdt_reset() */`,
      },
      codegenRules:
        `ESP-IDF 规则：\n` +
        `1. 使用 IDF v5 API（adc_oneshot / i2c_master 新驱动，勿用旧版 adc1_get_raw / i2c_cmd_link 旧接口）。\n` +
        `2. 外设配置结构体必须全部字段初始化（示例模板可直接用）。\n` +
        `3. 检查返回值用 ESP_ERROR_CHECK；任务栈 ≥2048 字。\n` +
        `4. 所有函数完整实现，禁止占位符。`,
    },
  },
  {
    model: "CH32V203",
    title: "CH32V203（RISC-V，兼容开发）",
    specs:
      "RISC-V4B 内核，144MHz，Flash 64KB，SRAM 20KB；2.5~5.5V（宽压）；" +
      "USB2.0 全速、2×ADC、4×USART、2×SPI、2×I2C、OPA；封装 LQFP48/QFN48；沁恒国产 RISC-V。",
    designNotes:
      "宽压供电 2.5~5.5V 适合直接 5V 系统；USB D+/D- 内置 PHY 无需外部晶体即可用内部 HSI 校准；" +
      "下载调试用 WCH-Link；外接 8MHz 晶振时负载电容按晶振规格 12~20pF。",
    code: {
      toolchain: "MounRiver Studio（RISC-V GCC），WCH 核心外设库（API 命名与 STM32 SPL 一致）；时钟 144MHz（HSE 8MHz PLL×18）由 system_ch32v20x.c 配置。",
      headers: `#include "ch32v20x.h"；APB1=72MHz（定时器×2=144MHz），APB2=144MHz。`,
      clockInit:
        `/* 144MHz 由启动文件配置；SysTick 1ms（RISC-V SysTick 用 SysTick->CNT 方式或官方 Delay_Init）*/\n` +
        `volatile unsigned int g_msTick = 0;\n` +
        `void SysTick_Handler(void) __attribute__((interrupt("WCH-Interrupt-fast")));\n` +
        `void SysTick_Handler(void){ g_msTick++; }`,
      irqStyle: "ISR 加 __attribute__((interrupt(\"WCH-Interrupt-fast\")))；向量名同 STM32 风格（USART1_IRQHandler 等）。",
      templates: { ...STM32_SPL_COMMON },
      codegenRules:
        `CH32V203 规则：外设库 API 与 STM32 SPL 同名（RCC_APB2PeriphClockCmd/GPIO_Init/USART_Init 等），\n` +
        `ISR 必须加 WCH-Interrupt-fast 属性；定时器时钟按 144MHz 计算（PSC 注意）；所有函数完整实现。`,
    },
  },
];

MCU_KNOWLEDGE.push(...MCU_COMPAT);

/** 通用接口设计规范（与具体型号无关的工程经验，始终注入） */
export const COMMON_DESIGN_RULES = `通用接口设计规范：
1. RS485：收发器（如 MAX3485/SP3485）A/B 总线末端 120Ω 端接，A 上拉 560Ω、B 下拉 560Ω 失效保护，总线入口 SM712（或 PESD1CAN）TVS 防护。
2. CAN：收发器 TJA1051/SN65HVD230，总线两端各 120Ω 端接，共模电感可选。
3. I2C：SDA/SCL 上拉 4.7kΩ（100kHz 标准模式），高速或长走线减至 2.2kΩ。
4. 晶振：负载电容按晶振 CL 计算（C=2×(CL-Cstray)，常用 18~22pF），走线 <10mm，远离高速信号并用地包围。
5. 去耦：每个电源引脚就近 100nF 陶瓷电容，每板电源入口 10~47μF 钽/电解 + 100nF。
6. ADC：信号源阻抗 <10kΩ，超限加电压跟随器；采样保持需 RC 抗混叠（1kΩ+100nF 典型）。
7. 复位：NRST 上拉 10kΩ + 对地 100nF；有手动复位按键时串联 100Ω。
8. 未用 IO：按手册设为确定电平（输出低/上拉输入），禁止悬空。
9. 电源分区：模拟（VDDA）经磁珠或 0Ω+滤波从数字电源分出，模拟地与数字地单点连接。
10. ESD 防护：对外连接器（USB/RS485/按键/端子）入口放置 TVS 阵列。`;

/** 按用户选择/输入的型号检索知识库，支持精确与前缀匹配 */
export function findKnowledge(mcu: string): McuKnowledge | undefined {
  const key = mcu.trim().toUpperCase();
  if (!key) return undefined;
  return MCU_KNOWLEDGE.find((k) => {
    const m = k.model.toUpperCase();
    return key === m || key.startsWith(m) || m.startsWith(key);
  });
}

/** 外设中文名 → 模板键映射 */
const PERIPHERAL_TEMPLATE_MAP: [RegExp, TemplateKey[]][] = [
  [/rs485|rs232|uart|串口/i, ["uart"]],
  [/北斗|gps|4g|cat\.1|lora|wifi|蓝牙|ble|nfc/i, ["uart"]], // 无线模组走 AT 指令串口
  [/can/i, ["can"]],
  [/i²c|i2c|eeprom/i, ["i2c"]],
  [/触摸/i, ["touch", "gpio"]],
  [/spi|显示屏|flash/i, ["spi"]],
  [/adc|模拟采集/i, ["adc"]],
  [/dac|模拟输出/i, ["dac"]],
  [/pwm|电机|蜂鸣/i, ["pwm", "timer"]],
  [/继电器|按键|led/i, ["gpio"]],
  [/usb/i, ["usb"]],
  [/rtc|实时时钟/i, ["rtc", "i2c"]],
  [/看门狗/i, ["wdt"]],
];

/** 根据用户勾选的外设，得出需要注入的模板键（自动并集 gpio/uart/timer 基础项） */
export function templateKeysFor(peripherals: string[]): TemplateKey[] {
  const keys = new Set<TemplateKey>(["gpio", "timer"]);
  for (const p of peripherals) {
    for (const [re, ks] of PERIPHERAL_TEMPLATE_MAP) {
      if (re.test(p)) ks.forEach((k) => keys.add(k));
    }
  }
  if (keys.size === 2) keys.add("uart"); // 默认至少给串口打印调试
  return [...keys];
}

/** 从文本中提取标识符（用于构建代码校验白名单） */
export function extractIdentifiers(text: string): Set<string> {
  const ids = new Set<string>();
  for (const m of text.matchAll(/\b([A-Za-z_]\w{2,})\s*\(/g)) ids.add(m[1]);
  return ids;
}

/** 构建注入提示词的代码知识段（按外设裁剪，控制长度） */
export function buildCodePrompt(
  kb: McuKnowledge | undefined,
  peripherals: string[],
): string {
  if (!kb) return "";
  const c = kb.code;
  const parts: string[] = [
    `【${kb.model} 代码级知识库——生成代码必须严格遵循】`,
    `工具链：${c.toolchain}`,
    `寄存器/头文件约定：${c.headers}`,
    `时钟与节拍：${c.clockInit}`,
    `中断写法：${c.irqStyle}`,
  ];
  const keys = templateKeysFor(peripherals);
  const tplLines: string[] = [];
  for (const k of keys) {
    const t = c.templates[k];
    if (t) tplLines.push(`--- ${k.toUpperCase()} 模板 ---\n${t}`);
  }
  if (tplLines.length) {
    parts.push(`外设初始化模板（已按需求勾选裁剪，直接在其基础上落实完整代码）：\n${tplLines.join("\n\n")}`);
  }
  parts.push(c.codegenRules);
  return parts.join("\n\n");
}
