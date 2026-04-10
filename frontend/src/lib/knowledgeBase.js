/**
 * knowledgeBase.js — 股票专业术语知识库
 * 内置 200+ 术语，提供 identifyTerms() 和 queryTerm() 函数
 */

/** @type {Array<{term: string, definition: string, usage: string, related_terms: string[]}>} */
export const TERMS = [
  { term: "K线", definition: "以开盘、收盘、最高、最低价绘制的蜡烛图，直观展示价格波动。", usage: "技术分析基础工具，用于判断趋势和形态。", related_terms: ["阳线", "阴线", "影线", "实体"] },
  { term: "阳线", definition: "收盘价高于开盘价的K线，通常用红色表示，代表价格上涨。", usage: "判断多头力量强弱。", related_terms: ["K线", "阴线", "多头"] },
  { term: "阴线", definition: "收盘价低于开盘价的K线，通常用绿色表示，代表价格下跌。", usage: "判断空头力量强弱。", related_terms: ["K线", "阳线", "空头"] },
  { term: "均线", definition: "一段时间内收盘价的算术平均值连线，平滑价格波动。", usage: "判断趋势方向和支撑阻力位。", related_terms: ["MA5", "MA20", "金叉", "死叉"] },
  { term: "MA5", definition: "5日移动平均线，反映短期价格趋势。", usage: "短线交易参考指标。", related_terms: ["均线", "MA20", "金叉"] },
  { term: "MA20", definition: "20日移动平均线，反映中期价格趋势。", usage: "中线交易参考指标。", related_terms: ["均线", "MA5", "死叉"] },
  { term: "MA60", definition: "60日移动平均线，反映中长期价格趋势。", usage: "中长线趋势判断。", related_terms: ["均线", "MA20", "MA120"] },
  { term: "MA120", definition: "120日移动平均线，反映长期价格趋势。", usage: "长线趋势判断。", related_terms: ["均线", "MA60"] },
  { term: "金叉", definition: "短期均线从下方穿越长期均线，通常视为买入信号。", usage: "MA5上穿MA20时产生金叉。", related_terms: ["均线", "死叉", "买入信号"] },
  { term: "死叉", definition: "短期均线从上方穿越长期均线，通常视为卖出信号。", usage: "MA5下穿MA20时产生死叉。", related_terms: ["均线", "金叉", "卖出信号"] },
  { term: "MACD", definition: "指数平滑异同移动平均线，由DIF、DEA和柱状图组成，判断趋势和动能。", usage: "MACD金叉买入，死叉卖出。", related_terms: ["DIF", "DEA", "MACD柱", "背离"] },
  { term: "DIF", definition: "MACD中的快线，由短期EMA减去长期EMA计算得出。", usage: "DIF上穿DEA为金叉信号。", related_terms: ["MACD", "DEA", "EMA"] },
  { term: "DEA", definition: "MACD中的慢线，是DIF的指数移动平均。", usage: "DEA作为信号线判断趋势。", related_terms: ["MACD", "DIF"] },
  { term: "RSI", definition: "相对强弱指数，衡量价格涨跌幅度，范围0-100。", usage: "RSI>70超买，RSI<30超卖。", related_terms: ["超买", "超卖", "KDJ"] },
  { term: "KDJ", definition: "随机指标，由K、D、J三条线组成，判断超买超卖。", usage: "KDJ金叉买入，死叉卖出。", related_terms: ["RSI", "超买", "超卖"] },
  { term: "布林带", definition: "由中轨（均线）和上下轨（标准差）组成的价格通道。", usage: "价格触及上轨可能回落，触及下轨可能反弹。", related_terms: ["均线", "标准差", "波动率"] },
  { term: "成交量", definition: "某一时间段内买卖双方成交的股票数量。", usage: "量价配合分析趋势真实性。", related_terms: ["成交额", "换手率", "量价关系"] },
  { term: "成交额", definition: "某一时间段内买卖双方成交的金额总量。", usage: "反映市场资金活跃程度。", related_terms: ["成交量", "换手率"] },
  { term: "换手率", definition: "成交量与流通股本的比值，反映股票活跃程度。", usage: "换手率高说明交投活跃。", related_terms: ["成交量", "流通股本"] },
  { term: "涨停", definition: "股价达到当日最大涨幅限制（A股通常为10%）。", usage: "涨停板是强势信号，但需注意开板风险。", related_terms: ["跌停", "涨跌幅限制", "一字板"] },
  { term: "跌停", definition: "股价达到当日最大跌幅限制（A股通常为10%）。", usage: "跌停板是弱势信号，需警惕连续跌停风险。", related_terms: ["涨停", "涨跌幅限制"] },
  { term: "T+1", definition: "当日买入的股票次日方可卖出的交易规则。", usage: "A股实行T+1制度，防止日内频繁交易。", related_terms: ["T+0", "交易规则"] },
  { term: "市盈率", definition: "股价与每股收益的比值（PE），衡量股票估值高低。", usage: "PE越低通常估值越便宜，但需结合行业比较。", related_terms: ["市净率", "PEG", "估值"] },
  { term: "市净率", definition: "股价与每股净资产的比值（PB），衡量资产价值。", usage: "PB<1可能意味着破净，需分析原因。", related_terms: ["市盈率", "净资产", "估值"] },
  { term: "PE", definition: "市盈率的英文缩写，Price-to-Earnings Ratio。", usage: "衡量股票相对盈利能力的估值指标。", related_terms: ["市盈率", "PB", "估值"] },
  { term: "PB", definition: "市净率的英文缩写，Price-to-Book Ratio。", usage: "衡量股票相对净资产的估值指标。", related_terms: ["市净率", "PE", "净资产"] },
  { term: "EPS", definition: "每股收益，公司净利润除以总股本。", usage: "EPS增长是股价上涨的基本驱动力。", related_terms: ["市盈率", "净利润", "ROE"] },
  { term: "ROE", definition: "净资产收益率，净利润与净资产的比值，衡量盈利能力。", usage: "ROE持续高于15%通常是优质公司标志。", related_terms: ["EPS", "净利润", "净资产"] },
  { term: "净利润", definition: "公司扣除所有成本和税费后的最终利润。", usage: "净利润增速是判断公司成长性的核心指标。", related_terms: ["EPS", "ROE", "营收"] },
  { term: "营收", definition: "公司在一定时期内的总销售收入。", usage: "营收增长反映公司业务扩张能力。", related_terms: ["净利润", "毛利率", "营业收入"] },
  { term: "毛利率", definition: "毛利润与营收的比值，反映产品盈利能力。", usage: "毛利率越高说明产品竞争力越强。", related_terms: ["净利润", "营收", "净利率"] },
  { term: "净利率", definition: "净利润与营收的比值，反映综合盈利能力。", usage: "净利率高说明公司费用控制好。", related_terms: ["毛利率", "净利润"] },
  { term: "资产负债率", definition: "总负债与总资产的比值，衡量财务风险。", usage: "资产负债率过高说明财务风险较大。", related_terms: ["负债", "净资产", "财务风险"] },
  { term: "现金流", definition: "公司在一定时期内现金流入和流出的净额。", usage: "自由现金流充裕是公司健康的重要标志。", related_terms: ["净利润", "经营活动现金流"] },
  { term: "分红", definition: "公司将部分利润以现金或股票形式分配给股东。", usage: "高分红股票适合长期持有获取稳定收益。", related_terms: ["股息率", "派息", "除权"] },
  { term: "股息率", definition: "每股股息与股价的比值，衡量分红回报率。", usage: "股息率高的股票适合价值投资者。", related_terms: ["分红", "派息"] },
  { term: "除权", definition: "股票分红或送股后，股价相应调整的过程。", usage: "除权后股价降低但总市值不变。", related_terms: ["分红", "送股", "填权"] },
  { term: "填权", definition: "除权后股价回升至除权前水平的过程。", usage: "填权说明市场认可公司价值。", related_terms: ["除权", "贴权"] },
  { term: "贴权", definition: "除权后股价继续下跌，未能回到除权前水平。", usage: "贴权说明市场对公司前景不乐观。", related_terms: ["除权", "填权"] },
  { term: "增发", definition: "上市公司向市场增加发行新股以募集资金。", usage: "增发会稀释原有股东权益，需关注募资用途。", related_terms: ["配股", "股权融资", "稀释"] },
  { term: "配股", definition: "上市公司向现有股东按比例发行新股的融资方式。", usage: "配股需要股东出资认购，否则权益被稀释。", related_terms: ["增发", "股权融资"] },
  { term: "回购", definition: "公司用自有资金在市场上购买自己发行的股票。", usage: "回购通常被视为公司对自身价值的认可。", related_terms: ["增发", "股本"] },
  { term: "大盘", definition: "指整个股票市场的整体走势，通常以上证指数代表。", usage: "大盘涨跌影响个股整体走势。", related_terms: ["上证指数", "沪深300", "指数"] },
  { term: "上证指数", definition: "反映上海证券交易所上市股票整体走势的指数。", usage: "上证指数是衡量A股市场的重要基准。", related_terms: ["大盘", "沪深300", "深证成指"] },
  { term: "沪深300", definition: "由沪深两市市值最大的300只股票组成的指数。", usage: "沪深300是A股最重要的宽基指数。", related_terms: ["上证指数", "中证500", "指数基金"] },
  { term: "中证500", definition: "由沪深两市中等市值的500只股票组成的指数。", usage: "中证500代表中小盘股整体走势。", related_terms: ["沪深300", "中证1000"] },
  { term: "板块", definition: "具有相似特征或业务的一组股票的集合。", usage: "板块轮动是市场资金流动的重要规律。", related_terms: ["行业", "概念股", "龙头股"] },
  { term: "龙头股", definition: "某一板块或行业中市值最大、影响力最强的股票。", usage: "龙头股往往引领板块走势。", related_terms: ["板块", "行业", "权重股"] },
  { term: "概念股", definition: "因某一热点概念或题材而受到市场关注的股票。", usage: "概念股炒作风险较大，需注意基本面支撑。", related_terms: ["板块", "题材股"] },
  { term: "权重股", definition: "在指数中占比较大、对指数影响显著的股票。", usage: "权重股走势对大盘指数影响较大。", related_terms: ["指数", "龙头股", "蓝筹股"] },
  { term: "蓝筹股", definition: "业绩稳定、分红良好、市值较大的优质上市公司股票。", usage: "蓝筹股适合长期价值投资。", related_terms: ["权重股", "白马股", "成长股"] },
  { term: "白马股", definition: "业绩优良、成长稳定、信息透明的优质股票。", usage: "白马股是价值投资者的首选标的。", related_terms: ["蓝筹股", "成长股"] },
  { term: "成长股", definition: "营收和利润保持高速增长的公司股票。", usage: "成长股估值通常较高，适合长期持有。", related_terms: ["白马股", "价值股", "PEG"] },
  { term: "价值股", definition: "估值偏低、具有安全边际的股票。", usage: "价值投资寻找被市场低估的股票。", related_terms: ["成长股", "市盈率", "安全边际"] },
  { term: "安全边际", definition: "股票内在价值与市场价格之间的差距，越大越安全。", usage: "价值投资要求足够的安全边际。", related_terms: ["价值股", "内在价值"] },
  { term: "内在价值", definition: "基于公司基本面分析得出的股票合理价值。", usage: "当市价低于内在价值时存在投资机会。", related_terms: ["安全边际", "估值", "DCF"] },
  { term: "DCF", definition: "现金流折现模型，通过预测未来现金流计算股票内在价值。", usage: "DCF是价值投资的核心估值方法。", related_terms: ["内在价值", "现金流", "折现率"] },
  { term: "多头", definition: "预期价格上涨并持有或买入股票的投资者或市场状态。", usage: "多头市场中买入持有是主要策略。", related_terms: ["空头", "牛市", "做多"] },
  { term: "空头", definition: "预期价格下跌并卖出或做空股票的投资者或市场状态。", usage: "空头市场中需要控制仓位。", related_terms: ["多头", "熊市", "做空"] },
  { term: "牛市", definition: "股市整体持续上涨的市场行情。", usage: "牛市中积极持仓，顺势而为。", related_terms: ["熊市", "多头", "行情"] },
  { term: "熊市", definition: "股市整体持续下跌的市场行情。", usage: "熊市中控制仓位，保存实力。", related_terms: ["牛市", "空头", "行情"] },
  { term: "震荡市", definition: "股市在一定区间内反复波动，无明显趋势的行情。", usage: "震荡市中高抛低吸，波段操作。", related_terms: ["牛市", "熊市", "区间"] },
  { term: "仓位", definition: "投资者持有股票的资金占总资金的比例。", usage: "合理控制仓位是风险管理的核心。", related_terms: ["满仓", "空仓", "加仓"] },
  { term: "满仓", definition: "将全部资金投入股票，仓位为100%。", usage: "满仓风险较高，需在确定性强时操作。", related_terms: ["仓位", "空仓", "重仓"] },
  { term: "空仓", definition: "不持有任何股票，全部为现金。", usage: "市场不明朗时空仓观望是明智选择。", related_terms: ["仓位", "满仓", "轻仓"] },
  { term: "加仓", definition: "在已有持仓基础上继续买入同一股票。", usage: "趋势确认后可适当加仓。", related_terms: ["仓位", "减仓", "补仓"] },
  { term: "减仓", definition: "卖出部分持仓，降低仓位比例。", usage: "获利后减仓锁定部分利润。", related_terms: ["仓位", "加仓", "止盈"] },
  { term: "补仓", definition: "在股价下跌后继续买入以降低持仓成本。", usage: "补仓需谨慎，避免越补越套。", related_terms: ["加仓", "成本价", "摊薄"] },
  { term: "止损", definition: "当股价跌至预设价位时卖出，控制亏损。", usage: "严格止损是保护本金的重要手段。", related_terms: ["止盈", "风险管理", "亏损"] },
  { term: "止盈", definition: "当股价涨至预设价位时卖出，锁定利润。", usage: "及时止盈避免利润回吐。", related_terms: ["止损", "获利", "减仓"] },
  { term: "支撑位", definition: "股价下跌时可能获得支撑、止跌反弹的价格区域。", usage: "在支撑位附近可考虑买入。", related_terms: ["阻力位", "压力位", "趋势线"] },
  { term: "阻力位", definition: "股价上涨时可能遇到阻力、止涨回落的价格区域。", usage: "在阻力位附近可考虑减仓。", related_terms: ["支撑位", "压力位", "突破"] },
  { term: "压力位", definition: "与阻力位含义相同，股价上涨的障碍价格区域。", usage: "突破压力位是强势信号。", related_terms: ["阻力位", "支撑位", "突破"] },
  { term: "突破", definition: "股价有效穿越支撑位或阻力位的价格行为。", usage: "放量突破阻力位是买入信号。", related_terms: ["支撑位", "阻力位", "成交量"] },
  { term: "回调", definition: "上涨趋势中的短暂下跌，通常是买入机会。", usage: "回调至均线支撑位可考虑买入。", related_terms: ["反弹", "趋势", "支撑位"] },
  { term: "反弹", definition: "下跌趋势中的短暂上涨，通常是卖出机会。", usage: "反弹至阻力位可考虑减仓。", related_terms: ["回调", "趋势", "阻力位"] },
  { term: "趋势", definition: "股价在一段时间内的总体运动方向。", usage: "顺势而为是交易的基本原则。", related_terms: ["上升趋势", "下降趋势", "趋势线"] },
  { term: "趋势线", definition: "连接价格高点或低点的直线，用于判断趋势方向。", usage: "价格跌破上升趋势线是卖出信号。", related_terms: ["趋势", "支撑位", "阻力位"] },
  { term: "头肩顶", definition: "由左肩、头部、右肩组成的顶部反转形态。", usage: "头肩顶完成后通常预示下跌。", related_terms: ["头肩底", "反转形态", "颈线"] },
  { term: "头肩底", definition: "由左肩、头部、右肩组成的底部反转形态。", usage: "头肩底完成后通常预示上涨。", related_terms: ["头肩顶", "反转形态", "颈线"] },
  { term: "双底", definition: "价格两次触及相近低点后反转上涨的形态，又称W底。", usage: "双底是强烈的底部反转信号。", related_terms: ["双顶", "头肩底", "反转形态"] },
  { term: "双顶", definition: "价格两次触及相近高点后反转下跌的形态，又称M顶。", usage: "双顶是强烈的顶部反转信号。", related_terms: ["双底", "头肩顶", "反转形态"] },
  { term: "旗形", definition: "价格快速上涨后横向整理形成的形态，通常继续上涨。", usage: "旗形整理后突破是买入信号。", related_terms: ["楔形", "三角形", "整理形态"] },
  { term: "楔形", definition: "价格在收窄的通道内运动形成的形态。", usage: "上升楔形通常是看跌信号。", related_terms: ["旗形", "三角形", "整理形态"] },
  { term: "三角形", definition: "价格在收窄的三角区间内震荡的整理形态。", usage: "三角形突破方向决定后续趋势。", related_terms: ["旗形", "楔形", "整理形态"] },
  { term: "背离", definition: "价格走势与技术指标走势方向相反的现象。", usage: "MACD顶背离是卖出信号，底背离是买入信号。", related_terms: ["MACD", "RSI", "顶背离"] },
  { term: "顶背离", definition: "价格创新高但指标未创新高，预示上涨动能减弱。", usage: "顶背离出现时应考虑减仓。", related_terms: ["背离", "底背离", "MACD"] },
  { term: "底背离", definition: "价格创新低但指标未创新低，预示下跌动能减弱。", usage: "底背离出现时可考虑逢低买入。", related_terms: ["背离", "顶背离", "RSI"] },
  { term: "量价关系", definition: "成交量与价格变化之间的关系，是判断趋势真实性的重要依据。", usage: "量增价涨是健康上涨，量减价涨需警惕。", related_terms: ["成交量", "价格", "趋势"] },
  { term: "放量", definition: "成交量明显大于近期平均水平。", usage: "放量突破阻力位是强势信号。", related_terms: ["缩量", "成交量", "突破"] },
  { term: "缩量", definition: "成交量明显小于近期平均水平。", usage: "缩量上涨动能不足，缩量下跌可能见底。", related_terms: ["放量", "成交量"] },
  { term: "主力", definition: "持有大量筹码、能影响股价走势的大资金。", usage: "跟踪主力资金动向有助于判断趋势。", related_terms: ["庄家", "资金流向", "筹码"] },
  { term: "筹码", definition: "投资者持有的股票数量，也指市场中的持仓分布。", usage: "筹码集中说明主力控盘程度高。", related_terms: ["主力", "持仓", "换手率"] },
  { term: "资金流向", definition: "资金流入或流出某只股票或板块的情况。", usage: "资金持续流入是股价上涨的动力。", related_terms: ["主力", "成交额", "净流入"] },
  { term: "净流入", definition: "买入金额大于卖出金额，资金净流入为正。", usage: "大单净流入通常是主力建仓信号。", related_terms: ["资金流向", "净流出"] },
  { term: "净流出", definition: "卖出金额大于买入金额，资金净流出为负。", usage: "持续净流出说明主力在出货。", related_terms: ["资金流向", "净流入"] },
  { term: "集合竞价", definition: "开盘前或收盘时，所有委托集中撮合成交的机制。", usage: "集合竞价价格反映市场对股票的整体预期。", related_terms: ["开盘价", "收盘价", "竞价"] },
  { term: "涨跌幅限制", definition: "A股规定股票每日涨跌幅不超过10%（ST股为5%）。", usage: "涨跌幅限制保护投资者免受极端波动。", related_terms: ["涨停", "跌停", "T+1"] },
  { term: "龙虎榜", definition: "交易所公布的成交金额前五名营业部的买卖数据。", usage: "龙虎榜可以了解主力机构的操作动向。", related_terms: ["主力", "机构", "游资"] },
  { term: "游资", definition: "短期逐利、快进快出的投机性资金。", usage: "游资炒作的股票波动大，风险高。", related_terms: ["主力", "机构", "龙虎榜"] },
  { term: "机构", definition: "基金、保险、券商等专业投资机构。", usage: "机构持仓比例高通常说明股票质地较好。", related_terms: ["主力", "游资", "基金"] },
  { term: "基金", definition: "集合投资者资金、由专业人士管理的投资工具。", usage: "基金适合不擅长选股的普通投资者。", related_terms: ["机构", "ETF", "指数基金"] },
  { term: "ETF", definition: "交易所交易基金，可像股票一样在交易所买卖的基金。", usage: "ETF是低成本投资指数的好工具。", related_terms: ["基金", "指数基金", "沪深300"] },
  { term: "指数基金", definition: "跟踪特定指数表现的基金，被动管理。", usage: "长期定投指数基金是稳健的投资策略。", related_terms: ["ETF", "基金", "沪深300"] },
  { term: "定投", definition: "定期定额投资，无论市场涨跌都按计划买入。", usage: "定投可以平摊成本，降低择时风险。", related_terms: ["指数基金", "长期投资"] },
  { term: "复利", definition: "利息再投资产生的利息，即利滚利效应。", usage: "长期投资中复利效应非常显著。", related_terms: ["定投", "长期投资", "收益率"] },
  { term: "夏普比率", definition: "超额收益与波动率的比值，衡量风险调整后的收益。", usage: "夏普比率越高说明单位风险获得的收益越多。", related_terms: ["最大回撤", "波动率", "收益率"] },
  { term: "最大回撤", definition: "投资组合从最高点到最低点的最大跌幅。", usage: "最大回撤越小说明风险控制越好。", related_terms: ["夏普比率", "波动率", "风险"] },
  { term: "波动率", definition: "价格变动的幅度和频率，衡量投资风险。", usage: "高波动率意味着高风险高收益。", related_terms: ["最大回撤", "夏普比率", "风险"] },
  { term: "胜率", definition: "盈利交易次数占总交易次数的比例。", usage: "高胜率配合合理盈亏比才能长期盈利。", related_terms: ["盈亏比", "交易系统", "风险管理"] },
  { term: "盈亏比", definition: "平均盈利金额与平均亏损金额的比值。", usage: "盈亏比大于2:1是良好的交易系统标准。", related_terms: ["胜率", "风险管理", "止损"] },
  { term: "仓位管理", definition: "合理分配资金到不同股票和时机的策略。", usage: "科学的仓位管理是长期盈利的关键。", related_terms: ["仓位", "风险管理", "分散投资"] },
  { term: "分散投资", definition: "将资金分配到多只股票或资产类别以降低风险。", usage: "不要把鸡蛋放在同一个篮子里。", related_terms: ["仓位管理", "风险管理", "组合投资"] },
  { term: "集中持仓", definition: "将大部分资金集中投入少数几只股票。", usage: "集中持仓风险高，需要对标的有深入研究。", related_terms: ["分散投资", "仓位管理"] },
  { term: "对冲", definition: "通过持有相关性负相关的资产来降低投资组合风险。", usage: "对冲策略可以在市场下跌时保护资产。", related_terms: ["风险管理", "做空", "期货"] },
  { term: "做多", definition: "买入股票，预期价格上涨后卖出获利。", usage: "A股普通投资者主要通过做多获利。", related_terms: ["做空", "多头", "买入"] },
  { term: "做空", definition: "借入股票卖出，预期价格下跌后买回还券获利。", usage: "A股融券可以实现做空，但门槛较高。", related_terms: ["做多", "空头", "融券"] },
  { term: "融资", definition: "向券商借钱买股票，放大投资规模。", usage: "融资可以放大收益，但同样放大风险。", related_terms: ["融券", "杠杆", "保证金"] },
  { term: "融券", definition: "向券商借股票卖出，实现做空。", usage: "融券是A股做空的主要方式。", related_terms: ["融资", "做空", "杠杆"] },
  { term: "杠杆", definition: "用借入资金放大投资规模的操作。", usage: "杠杆放大收益的同时也放大风险。", related_terms: ["融资", "融券", "风险"] },
  { term: "保证金", definition: "进行融资融券或期货交易时需要缴纳的担保资金。", usage: "保证金不足时会触发强制平仓。", related_terms: ["融资", "融券", "强平"] },
  { term: "强平", definition: "当保证金不足时，券商强制平仓以控制风险。", usage: "避免强平需要合理控制杠杆比例。", related_terms: ["保证金", "融资", "杠杆"] },
  { term: "期货", definition: "约定在未来某一时间以特定价格买卖资产的合约。", usage: "期货可用于对冲风险或投机。", related_terms: ["期权", "衍生品", "对冲"] },
  { term: "期权", definition: "赋予持有者在特定时间以特定价格买卖资产权利的合约。", usage: "期权可用于保险策略或方向性投机。", related_terms: ["期货", "衍生品", "对冲"] },
  { term: "量化交易", definition: "利用数学模型和计算机程序进行自动化交易。", usage: "量化交易可以消除情绪影响，提高执行效率。", related_terms: ["算法交易", "程序化交易", "回测"] },
  { term: "回测", definition: "用历史数据验证交易策略有效性的方法。", usage: "回测结果好不代表未来一定盈利。", related_terms: ["量化交易", "策略", "历史数据"] },
  { term: "策略", definition: "基于特定规则和条件的交易决策系统。", usage: "好的策略需要经过严格回测和实盘验证。", related_terms: ["回测", "量化交易", "交易系统"] },
  { term: "均值回归", definition: "价格偏离均值后倾向于回归均值的统计规律。", usage: "均值回归策略在震荡市中效果较好。", related_terms: ["均线", "波动率", "策略"] },
  { term: "动量", definition: "价格持续朝同一方向运动的趋势。", usage: "动量策略追涨杀跌，顺势而为。", related_terms: ["趋势", "策略", "量化交易"] },
  { term: "财报", definition: "上市公司定期发布的财务报告，包括年报、半年报、季报。", usage: "财报是基本面分析的核心数据来源。", related_terms: ["净利润", "营收", "EPS"] },
  { term: "年报", definition: "上市公司每年发布的全年财务报告。", usage: "年报是了解公司全年经营状况的重要文件。", related_terms: ["财报", "半年报", "季报"] },
  { term: "季报", definition: "上市公司每季度发布的财务报告。", usage: "季报可以及时了解公司业绩变化。", related_terms: ["财报", "年报", "半年报"] },
  { term: "业绩预告", definition: "上市公司在正式财报发布前对业绩的预先披露。", usage: "业绩预告超预期通常会推动股价上涨。", related_terms: ["财报", "净利润", "预期"] },
  { term: "商誉", definition: "企业并购时支付的超过被收购方净资产的溢价部分。", usage: "商誉减值会对公司利润造成重大影响。", related_terms: ["并购", "净资产", "减值"] },
  { term: "并购", definition: "一家公司收购或合并另一家公司的行为。", usage: "并购可以快速扩大公司规模，但整合风险较大。", related_terms: ["商誉", "重组", "资产注入"] },
  { term: "重组", definition: "公司通过资产置换、股权变更等方式改变经营结构。", usage: "重组预期往往会推动股价大幅波动。", related_terms: ["并购", "资产注入", "借壳"] },
  { term: "借壳", definition: "非上市公司通过收购上市公司实现间接上市的方式。", usage: "借壳上市是快速上市的途径之一。", related_terms: ["重组", "并购", "上市"] },
  { term: "解禁", definition: "限售股票到期后可以在市场上自由流通。", usage: "大量解禁可能带来抛售压力。", related_terms: ["限售股", "流通股", "减持"] },
  { term: "减持", definition: "大股东或机构投资者卖出所持股票。", usage: "大股东减持通常被视为负面信号。", related_terms: ["增持", "解禁", "大股东"] },
  { term: "增持", definition: "大股东或机构投资者买入更多股票。", usage: "大股东增持通常被视为正面信号。", related_terms: ["减持", "回购", "大股东"] },
  { term: "超买", definition: "RSI或KDJ等指标显示价格涨幅过大，可能面临回调。", usage: "RSI>70通常视为超买区域。", related_terms: ["超卖", "RSI", "KDJ"] },
  { term: "超卖", definition: "RSI或KDJ等指标显示价格跌幅过大，可能面临反弹。", usage: "RSI<30通常视为超卖区域。", related_terms: ["超买", "RSI", "KDJ"] },
  { term: "EMA", definition: "指数移动平均线，对近期价格赋予更高权重。", usage: "EMA比SMA对价格变化更敏感。", related_terms: ["均线", "MA5", "MACD"] },
  { term: "SMA", definition: "简单移动平均线，各时期价格权重相同。", usage: "SMA是最基础的均线计算方式。", related_terms: ["均线", "EMA"] },
  { term: "ATR", definition: "平均真实波幅，衡量价格波动幅度的指标。", usage: "ATR用于设置止损距离和仓位大小。", related_terms: ["波动率", "止损", "仓位管理"] },
  { term: "OBV", definition: "能量潮指标，通过成交量累积判断资金流向。", usage: "OBV与价格背离时预示趋势反转。", related_terms: ["成交量", "资金流向", "背离"] },
  { term: "CCI", definition: "顺势指标，衡量价格偏离统计均值的程度。", usage: "CCI>100超买，CCI<-100超卖。", related_terms: ["RSI", "KDJ", "超买"] },
  { term: "WR", definition: "威廉指标，衡量收盘价在最高最低价区间的位置。", usage: "WR>-20超买，WR<-80超卖。", related_terms: ["RSI", "KDJ", "超买"] },
  { term: "BOLL", definition: "布林带的简称，由中轨和上下轨组成的价格通道。", usage: "价格在布林带内运行，突破上轨可能继续上涨。", related_terms: ["布林带", "均线", "波动率"] },
  { term: "SAR", definition: "抛物线指标，跟踪趋势并提供止损参考点。", usage: "SAR翻转是趋势反转信号。", related_terms: ["趋势", "止损", "ATR"] },
  { term: "DMI", definition: "趋向指标，判断趋势强度和方向。", usage: "ADX>25说明趋势明显。", related_terms: ["趋势", "ADX"] },
  { term: "ADX", definition: "平均趋向指数，衡量趋势强度，不判断方向。", usage: "ADX越高说明趋势越强。", related_terms: ["DMI", "趋势"] },
  { term: "VWAP", definition: "成交量加权平均价格，机构常用的参考价格。", usage: "价格高于VWAP说明多头占优。", related_terms: ["均线", "成交量", "机构"] },
  { term: "市值", definition: "公司股票总数乘以当前股价的总价值。", usage: "市值是衡量公司规模的重要指标。", related_terms: ["总市值", "流通市值", "大盘股"] },
  { term: "流通市值", definition: "可在市场上自由交易的股票数量乘以股价的价值。", usage: "流通市值影响股票的流动性。", related_terms: ["市值", "流通股", "换手率"] },
  { term: "大盘股", definition: "市值较大的上市公司股票，通常超过500亿元。", usage: "大盘股流动性好，波动相对较小。", related_terms: ["中盘股", "小盘股", "蓝筹股"] },
  { term: "中盘股", definition: "市值中等的上市公司股票，通常在100-500亿元之间。", usage: "中盘股兼具成长性和稳定性。", related_terms: ["大盘股", "小盘股"] },
  { term: "小盘股", definition: "市值较小的上市公司股票，通常低于100亿元。", usage: "小盘股弹性大，但流动性和风险也更高。", related_terms: ["大盘股", "中盘股", "成长股"] },
  { term: "流通股", definition: "可以在市场上自由买卖的股票数量。", usage: "流通股越少，股价越容易被操控。", related_terms: ["总股本", "限售股", "流通市值"] },
  { term: "总股本", definition: "公司发行的全部股票数量，包括流通股和限售股。", usage: "总股本扩大会稀释每股收益。", related_terms: ["流通股", "限售股", "EPS"] },
  { term: "限售股", definition: "有锁定期限制、暂时不能在市场上流通的股票。", usage: "限售股解禁可能带来抛售压力。", related_terms: ["解禁", "流通股", "大股东"] },
  { term: "股权结构", definition: "公司各类股东持股比例的分布情况。", usage: "股权结构影响公司治理和控制权。", related_terms: ["大股东", "机构", "流通股"] },
  { term: "大股东", definition: "持有公司较大比例股份的主要股东。", usage: "大股东行为对股价有重要影响。", related_terms: ["股权结构", "减持", "增持"] },
  { term: "控股股东", definition: "持有公司50%以上股份或实际控制公司的股东。", usage: "控股股东的战略决策影响公司发展方向。", related_terms: ["大股东", "实际控制人"] },
  { term: "实际控制人", definition: "通过持股或协议等方式实际控制上市公司的人或机构。", usage: "实际控制人变更通常是重大事件。", related_terms: ["控股股东", "大股东"] },
  { term: "独立董事", definition: "与公司无利益关联、独立行使职权的董事会成员。", usage: "独立董事负责监督公司管理层。", related_terms: ["董事会", "公司治理"] },
  { term: "信息披露", definition: "上市公司依法向公众公开重要信息的行为。", usage: "及时准确的信息披露是市场公平的基础。", related_terms: ["公告", "财报", "监管"] },
  { term: "公告", definition: "上市公司向市场发布的正式通知或声明。", usage: "重大公告往往引发股价大幅波动。", related_terms: ["信息披露", "财报", "业绩预告"] },
  { term: "停牌", definition: "股票暂停交易，通常因重大事项需要披露。", usage: "停牌期间无法买卖，需关注复牌后走势。", related_terms: ["复牌", "公告", "重组"] },
  { term: "复牌", definition: "停牌后恢复正常交易。", usage: "复牌后股价可能出现大幅波动。", related_terms: ["停牌", "公告"] },
  { term: "退市", definition: "上市公司股票从证券交易所摘牌，不再公开交易。", usage: "退市风险股需要特别警惕。", related_terms: ["ST股", "*ST股", "上市"] },
  { term: "ST股", definition: "财务状况异常的上市公司股票，涨跌幅限制为5%。", usage: "ST股风险较高，需谨慎投资。", related_terms: ["*ST股", "退市", "财务风险"] },
  { term: "*ST股", definition: "连续亏损面临退市风险的上市公司股票。", usage: "*ST股退市风险极高，普通投资者应回避。", related_terms: ["ST股", "退市"] },
  { term: "新股", definition: "首次公开发行并上市交易的股票（IPO）。", usage: "新股上市初期往往有较大涨幅。", related_terms: ["IPO", "打新", "上市"] },
  { term: "IPO", definition: "首次公开募股，公司首次向公众发行股票并上市。", usage: "IPO是公司融资和股东退出的重要方式。", related_terms: ["新股", "上市", "打新"] },
  { term: "打新", definition: "申购新股的行为，中签后可获得新股。", usage: "打新是低风险获利的方式之一。", related_terms: ["新股", "IPO", "中签"] },
  { term: "科创板", definition: "上交所设立的专注于科技创新企业的股票市场。", usage: "科创板实行注册制，门槛较高。", related_terms: ["创业板", "主板", "注册制"] },
  { term: "创业板", definition: "深交所设立的专注于成长型创新企业的股票市场。", usage: "创业板股票波动较大，风险较高。", related_terms: ["科创板", "主板", "成长股"] },
  { term: "主板", definition: "上交所和深交所的主要股票市场，门槛较高。", usage: "主板上市公司规模较大，经营稳定。", related_terms: ["科创板", "创业板", "北交所"] },
  { term: "北交所", definition: "北京证券交易所，专注于服务创新型中小企业。", usage: "北交所是新三板精选层升级而来。", related_terms: ["主板", "科创板", "创业板"] },
  { term: "注册制", definition: "以信息披露为核心的股票发行制度，监管机构不对价值判断。", usage: "注册制下上市更便捷，但投资者需自行判断风险。", related_terms: ["核准制", "IPO", "科创板"] },
  { term: "核准制", definition: "监管机构对股票发行进行实质性审核的制度。", usage: "核准制下上市门槛较高，审核周期长。", related_terms: ["注册制", "IPO"] },
  { term: "做T", definition: "在同一账户同一股票上当日高卖低买，降低持仓成本。", usage: "做T需要对股票走势有较准确的判断。", related_terms: ["T+1", "波段操作", "仓位"] },
  { term: "波段操作", definition: "在价格波动中高卖低买，赚取差价的交易方式。", usage: "波段操作需要较强的技术分析能力。", related_terms: ["做T", "趋势", "支撑位"] },
  { term: "左侧交易", definition: "在趋势反转前提前布局的交易方式。", usage: "左侧交易风险较高，但潜在收益也更大。", related_terms: ["右侧交易", "趋势", "反转"] },
  { term: "右侧交易", definition: "在趋势确认后顺势跟进的交易方式。", usage: "右侧交易胜率较高，但入场价格较高。", related_terms: ["左侧交易", "趋势", "突破"] },
  { term: "追涨杀跌", definition: "在价格上涨时买入、下跌时卖出的非理性行为。", usage: "追涨杀跌是散户常见的亏损原因。", related_terms: ["情绪化交易", "风险管理"] },
  { term: "抄底", definition: "在价格处于低位时买入，预期价格反弹。", usage: "抄底需要判断是否真正见底，风险较大。", related_terms: ["左侧交易", "支撑位", "反弹"] },
  { term: "逃顶", definition: "在价格处于高位时卖出，预期价格下跌。", usage: "逃顶需要判断是否真正见顶，难度较大。", related_terms: ["右侧交易", "阻力位", "止盈"] },
  { term: "套牢", definition: "买入后股价下跌，持仓处于亏损状态。", usage: "套牢时需要分析是否继续持有或止损。", related_terms: ["止损", "补仓", "解套"] },
  { term: "解套", definition: "套牢的股票价格回升至成本价以上。", usage: "解套后需要决定是否继续持有。", related_terms: ["套牢", "成本价", "止盈"] },
  { term: "成本价", definition: "投资者买入股票的平均价格，包含手续费。", usage: "成本价是判断盈亏的基准价格。", related_terms: ["套牢", "解套", "补仓"] },
  { term: "手续费", definition: "买卖股票时向券商支付的佣金和税费。", usage: "手续费是交易成本的重要组成部分。", related_terms: ["印花税", "佣金", "成本价"] },
  { term: "印花税", definition: "股票交易时向国家缴纳的税费，目前卖出时收取0.1%。", usage: "印花税是交易成本的固定组成部分。", related_terms: ["手续费", "佣金"] },
  { term: "佣金", definition: "向券商支付的交易服务费用。", usage: "选择低佣金券商可以降低交易成本。", related_terms: ["手续费", "印花税"] },
  { term: "开盘价", definition: "股票当日第一笔成交的价格。", usage: "开盘价反映市场对前一日收盘后信息的反应。", related_terms: ["收盘价", "集合竞价", "跳空"] },
  { term: "收盘价", definition: "股票当日最后一笔成交的价格。", usage: "收盘价是技术分析中最重要的价格数据。", related_terms: ["开盘价", "K线", "均线"] },
  { term: "跳空", definition: "当日开盘价与前一日收盘价之间存在价格缺口。", usage: "向上跳空是强势信号，向下跳空是弱势信号。", related_terms: ["缺口", "开盘价", "收盘价"] },
  { term: "缺口", definition: "K线图上价格跳空形成的空白区域。", usage: "缺口通常会被回补，是重要的支撑阻力位。", related_terms: ["跳空", "支撑位", "阻力位"] },
  { term: "影线", definition: "K线上下两端的细线，代表最高价和最低价。", usage: "长上影线说明上方压力大，长下影线说明下方支撑强。", related_terms: ["K线", "实体", "最高价"] },
  { term: "实体", definition: "K线中开盘价和收盘价之间的矩形部分。", usage: "实体越长说明多空力量越强。", related_terms: ["K线", "影线", "阳线"] },
  { term: "十字星", definition: "开盘价与收盘价相同或非常接近的K线形态。", usage: "十字星出现在高位或低位时预示趋势反转。", related_terms: ["K线", "反转形态"] },
  { term: "锤子线", definition: "下影线很长、实体很小的K线，出现在低位是反转信号。", usage: "锤子线是底部反转的重要信号。", related_terms: ["K线", "反转形态", "支撑位"] },
  { term: "吞没形态", definition: "后一根K线实体完全包含前一根K线实体的形态。", usage: "看涨吞没是买入信号，看跌吞没是卖出信号。", related_terms: ["K线", "反转形态"] },
  { term: "早晨之星", definition: "由三根K线组成的底部反转形态。", usage: "早晨之星是强烈的底部反转信号。", related_terms: ["K线", "反转形态", "黄昏之星"] },
  { term: "黄昏之星", definition: "由三根K线组成的顶部反转形态。", usage: "黄昏之星是强烈的顶部反转信号。", related_terms: ["K线", "反转形态", "早晨之星"] },
];

// ---------------------------------------------------------------------------
// identifyTerms — 扫描文本中的已知术语，返回位置信息
// ---------------------------------------------------------------------------

/**
 * 识别文本中包含的已知专业术语
 * @param {string} text
 * @returns {Array<{term: string, start: number, end: number}>}
 */
export function identifyTerms(text) {
  if (!text || typeof text !== 'string') return [];
  const results = [];
  for (const entry of TERMS) {
    const term = entry.term;
    let idx = 0;
    while (idx < text.length) {
      const pos = text.indexOf(term, idx);
      if (pos === -1) break;
      results.push({ term, start: pos, end: pos + term.length });
      idx = pos + term.length;
    }
  }
  // 按 start 排序
  results.sort((a, b) => a.start - b.start);

  // 去除重叠：保留每个位置最长的匹配
  const deduped = [];
  let lastEnd = -1;
  for (const r of results) {
    if (r.start >= lastEnd) {
      deduped.push(r);
      lastEnd = r.end;
    } else if (r.end > lastEnd && deduped.length > 0) {
      // 当前匹配更长，替换上一个
      const prev = deduped[deduped.length - 1];
      if (r.start === prev.start && r.end > prev.end) {
        deduped[deduped.length - 1] = r;
        lastEnd = r.end;
      }
    }
  }
  return deduped;
}

// ---------------------------------------------------------------------------
// queryTerm — 查询术语详情
// ---------------------------------------------------------------------------

/**
 * 查询指定术语的详情
 * @param {string} term
 * @returns {{definition: string, usage: string, related_terms: string[]} | null}
 */
export function queryTerm(term) {
  if (!term || typeof term !== 'string') return null;
  const entry = TERMS.find(t => t.term === term);
  if (!entry) return null;
  return {
    definition: entry.definition,
    usage: entry.usage,
    related_terms: entry.related_terms,
  };
}
