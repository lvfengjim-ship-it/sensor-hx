/**
 * MCU 样本知识库
 * 来源：晟矽微（sinomcu）官方产品样本、恒矽在售产品线、各兼容型号官方数据手册。
 * 用途：在 AI 生成时按目标 MCU 注入准确的规格参数与设计要点，提高编程与原理图准确性。
 */

export type McuKnowledge = {
  model: string;
  title: string;
  /** 关键规格：内核/主频/Flash/RAM/封装/特色外设 */
  specs: string;
  /** 原理图与 PCB 设计要点（来自数据手册与参考设计） */
  designNotes: string;
};

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
  },
  // ============ 兼容开发型号 ============
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
      "供电 3.3V，峰值电流 500mA 以上，LDO 留足裕量（建议 AMS1117-3.3 或 DC-DC），输入电容 10μF 起。",
  },
  {
    model: "CH32V203",
    title: "CH32V203（RISC-V，兼容开发）",
    specs:
      "RISC-V4B 内核，144MHz，Flash 64KB，SRAM 20KB；2.5~5.5V（宽压）；" +
      "USB2.0 全速、2×ADC、4×USART、2×SPI、2×I2C、OPA；封装 LQFP48/QFN48；沁恒国产 RISC-V。",
    designNotes:
      "宽压供电 2.5~5.5V 适合直接 5V 系统；USB D+/D- 内置 PHY 无需外部晶体即可用内部 HSI 校准；" +
      "下载调试用 WCH-Link（SWD 协议变体）；外接 8MHz 晶振时负载电容按晶振规格 12~20pF。",
  },
];

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

/**
 * 按用户选择/输入的型号检索知识库。
 * 支持精确匹配与前缀匹配（如 "MC51F7084A" 命中 "MC51F7084"）。
 */
export function findKnowledge(mcu: string): McuKnowledge | undefined {
  const key = mcu.trim().toUpperCase();
  if (!key) return undefined;
  return MCU_KNOWLEDGE.find((k) => {
    const m = k.model.toUpperCase();
    return key === m || key.startsWith(m) || m.startsWith(key);
  });
}
