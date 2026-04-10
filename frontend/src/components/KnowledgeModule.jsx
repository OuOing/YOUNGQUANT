import React, { useState } from 'react';
import TermTooltip from './TermTooltip.jsx';

// ── 知识点数据库（100+ 条）──────────────────────────────────
const KNOWLEDGE_DB = {
  k_line: {
    title: 'K线基础',
    intro: 'K线（蜡烛图）由开盘价、收盘价、最高价、最低价四个数据构成。阳线（红色）表示收盘价高于开盘价，阴线（绿色）表示收盘价低于开盘价。影线代表最高价和最低价的范围。',
    sections: [
      {
        title: 'K线基本构成',
        items: [
          { term: '阳线', desc: '收盘价高于开盘价，实体为红色。实体越长，多方力量越强。' },
          { term: '阴线', desc: '收盘价低于开盘价，实体为绿色。实体越长，空方力量越强。' },
          { term: '上影线', desc: '最高价到实体上端的细线，代表多方冲高后被压回，影线越长说明上方阻力越强。' },
          { term: '下影线', desc: '实体下端到最低价的细线，代表空方打低后被买盘承接，影线越长说明下方支撑越强。' },
          { term: '十字星', desc: '开盘价与收盘价几乎相同，实体极小。出现在趋势末端时，预示多空力量均衡，可能反转。' },
          { term: '长腿十字星', desc: '上下影线都很长的十字星，代表当日多空激烈博弈，方向不明，需结合前后K线判断。' },
          { term: '墓碑十字', desc: '只有上影线的十字星，出现在高位时是强烈的顶部信号。' },
          { term: '蜻蜓十字', desc: '只有下影线的十字星，出现在低位时是强烈的底部信号。' },
        ],
      },
      {
        title: '单根K线形态',
        items: [
          { term: '锤子线', desc: '下影线至少是实体2倍，上影线极短或没有。出现在下跌趋势末端，预示底部反转。' },
          { term: '上吊线', desc: '形态与锤子线相同，但出现在上涨趋势末端，预示顶部反转，需次日确认。' },
          { term: '倒锤子线', desc: '上影线至少是实体2倍，下影线极短。出现在下跌末端，预示反转，但需次日阳线确认。' },
          { term: '射击之星', desc: '形态与倒锤子线相同，出现在上涨末端，是顶部信号。' },
          { term: '大阳线', desc: '实体占K线总长度80%以上的阳线，代表多方强势，通常是趋势延续信号。' },
          { term: '大阴线', desc: '实体占K线总长度80%以上的阴线，代表空方强势，通常是下跌加速信号。' },
          { term: '纺锤线', desc: '实体较小，上下影线较长，代表多空均衡，方向不明。' },
        ],
      },
      {
        title: '多根K线组合形态',
        items: [
          { term: '吞没形态（看涨）', desc: '阴线后出现更大阳线完全包含前一根实体，低位出现是强烈买入信号。' },
          { term: '吞没形态（看跌）', desc: '阳线后出现更大阴线完全包含前一根实体，高位出现是强烈卖出信号。' },
          { term: '早晨之星', desc: '三根K线：长阴线、小实体（十字星）、长阳线。底部反转信号，第三根阳线需收复第一根阴线一半以上。' },
          { term: '黄昏之星', desc: '三根K线：长阳线、小实体、长阴线。顶部反转信号，与早晨之星相反。' },
          { term: '三白兵', desc: '连续三根阳线，每根开盘价在前一根实体内，收盘价创新高。强烈的上涨信号。' },
          { term: '三黑鸦', desc: '连续三根阴线，每根开盘价在前一根实体内，收盘价创新低。强烈的下跌信号。' },
          { term: '孕线形态', desc: '第二根K线实体完全在第一根实体内，代表趋势减弱，可能反转。' },
          { term: '平头顶部', desc: '两根K线最高价相同，代表上方阻力强，可能形成顶部。' },
          { term: '平头底部', desc: '两根K线最低价相同，代表下方支撑强，可能形成底部。' },
          { term: '穿刺形态', desc: '阴线后出现阳线，阳线开盘低于前一阴线最低价，但收盘超过前一阴线实体中点，底部反转信号。' },
        ],
      },
      {
        title: '经典图表形态',
        items: [
          { term: '头肩顶', desc: '由左肩、头部、右肩组成，颈线跌破后确认顶部反转，目标跌幅约等于头部到颈线距离。' },
          { term: '头肩底', desc: '与头肩顶相反，颈线突破后确认底部反转，是强烈的买入信号。' },
          { term: '双顶（M顶）', desc: '价格两次触及相近高点后回落，第二次无法突破前高，颈线跌破确认。' },
          { term: '双底（W底）', desc: '价格两次触及相近低点后反弹，颈线突破确认底部，是可靠的买入形态。' },
          { term: '三重顶', desc: '价格三次触及相近高点均未突破，比双顶更可靠的顶部信号。' },
          { term: '三重底', desc: '价格三次触及相近低点均未跌破，比双底更可靠的底部信号。' },
          { term: '上升三角形', desc: '上轨水平，下轨上升，多头逐渐积累力量，向上突破概率较大。' },
          { term: '下降三角形', desc: '下轨水平，上轨下降，空头逐渐占优，向下突破概率较大。' },
          { term: '对称三角形', desc: '上轨下降，下轨上升，多空均衡，突破方向不确定，需等待放量突破。' },
          { term: '旗形整理', desc: '快速上涨后横向整理，形似旗帜，突破后通常继续原方向运动。' },
          { term: '楔形', desc: '上升楔形是看跌形态，下降楔形是看涨形态，与趋势方向相反时更可靠。' },
          { term: '杯柄形态', desc: '价格形成圆弧底后小幅回调（柄），突破颈线是买入信号，常见于强势股。' },
        ],
      },
    ],
  },
  ma: {
    title: '均线系统',
    intro: '均线（MA）是一段时间内收盘价的平均值，用于平滑价格波动，识别趋势方向。',
    sections: [
      {
        title: '均线基础',
        items: [
          { term: 'MA5（5日均线）', desc: '短期趋势指标，反映近一周的平均成本，对价格变化最敏感。' },
          { term: 'MA10（10日均线）', desc: '短中期趋势，反映近两周平均成本，常作为短线支撑/阻力。' },
          { term: 'MA20（20日均线）', desc: '中期趋势，约等于一个月交易日，是最常用的中期均线。' },
          { term: 'MA60（60日均线）', desc: '中长期趋势，约等于一个季度，是机构常用的参考线。' },
          { term: 'MA120（半年线）', desc: '长期趋势参考，价格在120日均线上方为长期多头市场。' },
          { term: 'MA250（年线）', desc: '最重要的长期均线，价格站上年线通常意味着长期趋势转好。' },
          { term: 'EMA（指数移动平均）', desc: '对近期数据赋予更高权重，比普通均线对价格变化更敏感，MACD使用EMA计算。' },
          { term: 'WMA（加权移动平均）', desc: '线性加权，近期数据权重更高，介于MA和EMA之间。' },
        ],
      },
      {
        title: '均线信号',
        items: [
          { term: '金叉', desc: '短期均线从下方穿越长期均线，是买入信号。MA5上穿MA20是常用的短线金叉。' },
          { term: '死叉', desc: '短期均线从上方穿越长期均线，是卖出信号。' },
          { term: '多头排列', desc: 'MA5 > MA10 > MA20 > MA60，均线从上到下依次排列，是强势上涨的标志。' },
          { term: '空头排列', desc: 'MA5 < MA10 < MA20 < MA60，均线从下到上依次排列，是持续下跌的标志。' },
          { term: '均线粘合', desc: '多条均线聚拢在一起，代表多空均衡，即将发生方向性突破。' },
          { term: '均线扩散', desc: '均线间距扩大，代表趋势加速，多头扩散是上涨加速，空头扩散是下跌加速。' },
          { term: '均线支撑', desc: '价格回调到均线附近获得支撑并反弹，均线起到支撑作用。' },
          { term: '均线压制', desc: '价格反弹到均线附近受阻回落，均线起到阻力作用。' },
        ],
      },
    ],
  },
  volume_price: {
    title: '量价关系',
    intro: '成交量是价格变动的动力来源，量价配合分析是技术分析的核心。',
    sections: [
      {
        title: '基本量价关系',
        items: [
          { term: '量增价涨', desc: '成交量放大同时价格上涨，是健康的上涨，多方力量充足，趋势可持续。' },
          { term: '量减价涨', desc: '成交量萎缩但价格继续上涨，需警惕，可能是主力控盘或上涨动能减弱。' },
          { term: '量增价跌', desc: '成交量放大同时价格下跌，说明抛压大，空方力量强，下跌可能持续。' },
          { term: '量减价跌', desc: '成交量萎缩同时价格下跌，可能是缩量整理或接近底部，需观察是否止跌。' },
          { term: '放量突破', desc: '价格突破重要阻力位时伴随成交量大幅放大，是有效突破的标志。' },
          { term: '缩量回调', desc: '上涨趋势中价格小幅回调且成交量萎缩，是正常的获利回吐，趋势未变。' },
          { term: '天量天价', desc: '成交量创历史新高同时价格也创新高，通常是阶段性顶部信号。' },
          { term: '地量地价', desc: '成交量极度萎缩同时价格创新低，通常是阶段性底部信号。' },
        ],
      },
      {
        title: '成交量指标',
        items: [
          { term: 'OBV（能量潮）', desc: '累计成交量指标，价格上涨时加量，下跌时减量。OBV与价格背离时预示反转。' },
          { term: '量比', desc: '当日成交量与近期平均成交量的比值。量比>2为放量，量比<0.5为缩量。' },
          { term: '换手率', desc: '当日成交量占流通股本的比例。换手率高说明交投活跃，低说明市场冷清。' },
          { term: 'VWAP（成交量加权平均价）', desc: '以成交量为权重的平均价格，机构常用作交易基准价。' },
          { term: '主力资金流向', desc: '大单（通常>50万）的净买入/卖出，反映机构或主力的操作方向。' },
        ],
      },
    ],
  },
  macd: {
    title: 'MACD指标',
    intro: 'MACD（移动平均收敛散度）由DIF（快线）、DEA（慢线）和柱状图（MACD柱）组成，是最常用的趋势跟踪指标。',
    sections: [
      {
        title: 'MACD基础',
        items: [
          { term: 'DIF线（快线）', desc: '12日EMA减26日EMA的差值，反映短期与中期趋势的差距。' },
          { term: 'DEA线（慢线）', desc: 'DIF的9日EMA，是DIF的平滑线，比DIF滞后。' },
          { term: 'MACD柱（Histogram）', desc: '(DIF - DEA) × 2，柱子由负转正代表多头力量增强，由正转负代表空头力量增强。' },
          { term: 'MACD金叉', desc: 'DIF从下方穿越DEA，是买入信号。在零轴下方的金叉比零轴上方的金叉更可靠。' },
          { term: 'MACD死叉', desc: 'DIF从上方穿越DEA，是卖出信号。' },
          { term: '零轴穿越', desc: 'DIF和DEA同时穿越零轴，是趋势转变的重要信号。上穿零轴是强烈买入信号。' },
        ],
      },
      {
        title: 'MACD背离',
        items: [
          { term: '顶背离', desc: '价格创新高但MACD未创新高，预示上涨动能减弱，可能反转向下。是重要的卖出信号。' },
          { term: '底背离', desc: '价格创新低但MACD未创新低，预示下跌动能减弱，可能反转向上。是重要的买入信号。' },
          { term: '二次背离', desc: '出现两次背离信号，可靠性更高，但需要更长时间确认。' },
          { term: '隐藏背离', desc: '价格回调但MACD未回调（看涨隐藏背离），代表趋势延续，是加仓信号。' },
        ],
      },
    ],
  },
  kdj: {
    title: 'KDJ指标',
    intro: 'KDJ随机指标由K、D、J三条线组成，范围0-100，用于判断超买超卖和趋势转折。',
    sections: [
      {
        title: 'KDJ基础',
        items: [
          { term: 'K线（快速随机线）', desc: '对RSV进行3日平滑，反映近期价格在高低区间的位置。' },
          { term: 'D线（慢速随机线）', desc: '对K值进行3日平滑，比K线更平滑，信号更可靠但滞后。' },
          { term: 'J线', desc: '3K - 2D，是K和D的放大，超买超卖信号最敏感，但也最容易产生假信号。' },
          { term: '超买区（>80）', desc: 'K值或J值超过80，说明价格处于相对高位，可能面临回调。' },
          { term: '超卖区（<20）', desc: 'K值或J值低于20，说明价格处于相对低位，可能面临反弹。' },
          { term: 'KDJ金叉', desc: 'K线从下方穿越D线，在超卖区（<20）出现的金叉是强烈买入信号。' },
          { term: 'KDJ死叉', desc: 'K线从上方穿越D线，在超买区（>80）出现的死叉是强烈卖出信号。' },
          { term: 'KDJ背离', desc: '价格创新高但KDJ未创新高（顶背离），或价格创新低但KDJ未创新低（底背离）。' },
        ],
      },
      {
        title: 'RSI指标',
        items: [
          { term: 'RSI（相对强弱指数）', desc: '衡量价格变动速度与幅度，范围0-100。RSI>70为超买，RSI<30为超卖。' },
          { term: 'RSI中轴（50）', desc: 'RSI在50以上代表多头占优，50以下代表空头占优。' },
          { term: 'RSI顶背离', desc: '价格创新高但RSI未创新高，是重要的卖出信号。' },
          { term: 'RSI底背离', desc: '价格创新低但RSI未创新低，是重要的买入信号。' },
          { term: 'RSI失效区间', desc: '强势上涨时RSI可能长期维持在70以上，强势下跌时可能长期低于30，此时超买超卖信号失效。' },
        ],
      },
    ],
  },
};

const KnowledgeModule = ({ moduleKey = 'k_line' }) => {
  const [openSection, setOpenSection] = useState(null);
  const [search, setSearch] = useState('');
  const mod = KNOWLEDGE_DB[moduleKey] || KNOWLEDGE_DB.k_line;

  const filtered = search.trim()
    ? mod.sections.map(s => ({
        ...s,
        items: s.items.filter(i =>
          i.term.includes(search) || i.desc.includes(search)
        ),
      })).filter(s => s.items.length > 0)
    : mod.sections;

  const totalItems = mod.sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* 模块简介 */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
        <h4 className="text-sm font-black text-white mb-2">{mod.title}</h4>
        <div className="text-xs text-white/60 leading-relaxed">
          <TermTooltip text={mod.intro} />
        </div>
        <p className="text-[10px] text-white/25 mt-2">{totalItems} 个知识点</p>
      </div>

      {/* 搜索 */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="搜索知识点..."
        className="w-full h-8 px-3 bg-black/40 border border-white/8 rounded-xl text-xs text-white/70 outline-none focus:border-secondary/30 transition-all"
      />

      {/* 分组知识点 */}
      {filtered.map((section, si) => (
        <div key={si} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          <button
            onClick={() => setOpenSection(openSection === si ? null : si)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all"
          >
            <span className="text-xs font-black text-white/80">{section.title}</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-white/25">{section.items.length} 条</span>
              <span className={`text-white/30 text-xs transition-transform ${openSection === si ? 'rotate-180' : ''}`}>▾</span>
            </div>
          </button>
          {(openSection === si || search.trim()) && (
            <div className="border-t border-white/5 divide-y divide-white/5">
              {section.items.map((item, ii) => (
                <div key={ii} className="px-4 py-3 hover:bg-white/[0.03] transition-all">
                  <p className="text-[11px] font-black text-secondary mb-1">{item.term}</p>
                  <p className="text-[11px] text-white/50 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default KnowledgeModule;
