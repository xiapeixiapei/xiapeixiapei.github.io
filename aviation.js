/* aviation.js: shared helpers for the flight log (flights.html) and its editor in the Site Manager.
 *
 * - Aircraft types: ICAO type designator → name, manufacturer, body class and real dimensions (length,
 *   wingspan, height, seats, range, first flight); the 3D models in fleet3d.js are built to these sizes.
 * - Chinese names for common airlines and manufacturers; the usual names of airports (Aviation.airportName).
 * - Great-circle distance, estimated flight time and great-circle paths for the map.
 *
 * Usage: window.Aviation.type('B77W'), Aviation.typeName(code, lang), Aviation.silhouette(kind), …
 */
(function () {
  'use strict';

  // ── Aircraft types: [ICAO code, name, manufacturer, body] ──
  // body: narrow | wide | quad (four engines) | regional | turboprop
  // [ICAO code, name, manufacturer, body, length m, wingspan m, height m, typical seats, range km, first flight]
  const TYPES = [
    ['A318', 'Airbus A318', 'Airbus', 'narrow', 31.4, 34.1, 12.6, 107, 5750, 2002],
    ['A319', 'Airbus A319', 'Airbus', 'narrow', 33.8, 34.1, 11.8, 124, 6950, 1995],
    ['A320', 'Airbus A320', 'Airbus', 'narrow', 37.6, 34.1, 11.8, 150, 6100, 1987],
    ['A20N', 'Airbus A320neo', 'Airbus', 'narrow', 37.6, 35.8, 11.8, 165, 6300, 2014],
    ['A321', 'Airbus A321', 'Airbus', 'narrow', 44.5, 34.1, 11.8, 185, 5950, 1993],
    ['A21N', 'Airbus A321neo', 'Airbus', 'narrow', 44.5, 35.8, 11.8, 206, 7400, 2016],
    ['BCS1', 'Airbus A220-100', 'Airbus', 'narrow', 35.0, 35.1, 11.5, 116, 6390, 2013],
    ['BCS3', 'Airbus A220-300', 'Airbus', 'narrow', 38.7, 35.1, 11.5, 141, 6670, 2015],
    ['A332', 'Airbus A330-200', 'Airbus', 'wide', 58.8, 60.3, 17.4, 247, 13450, 1997],
    ['A333', 'Airbus A330-300', 'Airbus', 'wide', 63.7, 60.3, 16.8, 277, 11750, 1992],
    ['A339', 'Airbus A330-900neo', 'Airbus', 'wide', 63.7, 64.0, 16.8, 287, 13300, 2017],
    ['A343', 'Airbus A340-300', 'Airbus', 'quad', 63.7, 60.3, 16.9, 277, 13500, 1991],
    ['A346', 'Airbus A340-600', 'Airbus', 'quad', 75.4, 63.4, 17.9, 326, 14350, 2001],
    ['A359', 'Airbus A350-900', 'Airbus', 'wide', 66.8, 64.75, 17.05, 315, 15000, 2013],
    ['A35K', 'Airbus A350-1000', 'Airbus', 'wide', 73.8, 64.75, 17.08, 369, 16100, 2016],
    ['A388', 'Airbus A380-800', 'Airbus', 'quad', 72.7, 79.8, 24.1, 555, 14800, 2005],
    ['B733', 'Boeing 737-300', 'Boeing', 'narrow', 33.4, 28.9, 11.1, 128, 4200, 1984],
    ['B737', 'Boeing 737-700', 'Boeing', 'narrow', 33.6, 35.8, 12.5, 126, 6200, 1997],
    ['B738', 'Boeing 737-800', 'Boeing', 'narrow', 39.5, 35.8, 12.5, 162, 5400, 1997],
    ['B739', 'Boeing 737-900', 'Boeing', 'narrow', 42.1, 35.8, 12.5, 178, 5800, 2006],
    ['B38M', 'Boeing 737 MAX 8', 'Boeing', 'narrow', 39.5, 35.9, 12.3, 178, 6500, 2016],
    ['B39M', 'Boeing 737 MAX 9', 'Boeing', 'narrow', 42.2, 35.9, 12.3, 193, 6500, 2017],
    ['B744', 'Boeing 747-400', 'Boeing', 'quad', 70.7, 64.4, 19.4, 416, 13450, 1988],
    ['B748', 'Boeing 747-8', 'Boeing', 'quad', 76.3, 68.4, 19.4, 467, 14300, 2011],
    ['B752', 'Boeing 757-200', 'Boeing', 'narrow', 47.3, 38.1, 13.6, 200, 7250, 1982],
    ['B763', 'Boeing 767-300', 'Boeing', 'wide', 54.9, 47.6, 15.8, 218, 11000, 1986],
    ['B772', 'Boeing 777-200', 'Boeing', 'wide', 63.7, 60.9, 18.5, 313, 9700, 1994],
    ['B77L', 'Boeing 777-200LR', 'Boeing', 'wide', 63.7, 64.8, 18.6, 317, 15840, 2005],
    ['B77W', 'Boeing 777-300ER', 'Boeing', 'wide', 73.9, 64.8, 18.5, 396, 13650, 2003],
    ['B779', 'Boeing 777-9', 'Boeing', 'wide', 76.7, 71.8, 19.7, 426, 13500, 2020],
    ['B788', 'Boeing 787-8', 'Boeing', 'wide', 56.7, 60.1, 16.9, 248, 13530, 2009],
    ['B789', 'Boeing 787-9', 'Boeing', 'wide', 62.8, 60.1, 17.0, 296, 14010, 2013],
    ['B78X', 'Boeing 787-10', 'Boeing', 'wide', 68.3, 60.1, 17.0, 336, 11730, 2017],
    ['C919', 'COMAC C919', 'COMAC', 'narrow', 38.9, 35.8, 11.95, 164, 5555, 2017],
    ['AJ27', 'COMAC ARJ21 (C909)', 'COMAC', 'regional', 33.5, 27.3, 8.4, 90, 3700, 2008],
    ['E170', 'Embraer 170', 'Embraer', 'regional', 29.9, 26.0, 9.85, 72, 3900, 2002],
    ['E175', 'Embraer 175', 'Embraer', 'regional', 31.7, 26.0, 9.73, 78, 3700, 2003],
    ['E190', 'Embraer 190', 'Embraer', 'regional', 36.2, 28.7, 10.6, 100, 4500, 2004],
    ['E195', 'Embraer 195', 'Embraer', 'regional', 38.7, 28.7, 10.6, 116, 4200, 2004],
    ['E290', 'Embraer 190-E2', 'Embraer', 'regional', 36.3, 33.7, 11.0, 106, 5300, 2016],
    ['E295', 'Embraer 195-E2', 'Embraer', 'regional', 41.5, 35.1, 10.9, 132, 4800, 2017],
    ['CRJ9', 'Bombardier CRJ900', 'Bombardier', 'regional', 36.2, 24.9, 7.5, 86, 2900, 2001],
    ['DH8D', 'De Havilland Dash 8-400', 'De Havilland Canada', 'turboprop', 32.8, 28.4, 8.3, 78, 2000, 1998],
    ['AT76', 'ATR 72-600', 'ATR', 'turboprop', 27.2, 27.05, 7.65, 70, 1500, 2009],
    ['F100', 'Fokker 100', 'Fokker', 'regional', 35.5, 28.1, 8.5, 107, 3100, 1986],
  ].map(([code, name, mfr, body, len, span, height, seats, range, year]) => ({ code, name, mfr, body, len, span, height, seats, range, year }));
  const BY_CODE = new Map(TYPES.map(t => [t.code, t]));

  const MFR_ZH = { Airbus: '空客', Boeing: '波音', COMAC: '中国商飞', Embraer: '巴航工业', Bombardier: '庞巴迪', 'De Havilland Canada': '德哈维兰', ATR: 'ATR', Fokker: '福克' };
  // Chinese short names; everything else shows its English name in both languages
  const AIRLINE_ZH = {
    CA: '中国国际航空', MU: '中国东方航空', CZ: '中国南方航空', HU: '海南航空', '3U': '四川航空', ZH: '深圳航空', MF: '厦门航空',
    CN: '大新华航空', KY: '昆明航空', TO: '法国泛航航空',
    FM: '上海航空', HO: '吉祥航空', '9C': '春秋航空', KN: '中国联合航空', SC: '山东航空', GS: '天津航空', JD: '首都航空', PN: '西部航空',
    TV: '西藏航空', EU: '成都航空', G5: '华夏航空', '8L': '祥鹏航空', BK: '奥凯航空', NS: '河北航空', GJ: '长龙航空', QW: '青岛航空', DR: '瑞丽航空',
    CX: '国泰航空', HX: '香港航空', UO: '香港快运', NX: '澳门航空', CI: '中华航空', BR: '长荣航空', JX: '星宇航空',
    KL: '荷兰皇家航空', AF: '法国航空', LH: '汉莎航空', BA: '英国航空', AY: '芬兰航空', SK: '北欧航空', LX: '瑞士国际航空', OS: '奥地利航空',
    IB: '西班牙国家航空', AZ: '意大利航空', TP: '葡萄牙航空', EI: '爱尔兰航空', LO: '波兰航空', TK: '土耳其航空', SU: '俄罗斯航空',
    U2: '易捷航空', FR: '瑞安航空', HV: '泛航航空', W6: '维兹航空', VY: '伏林航空', EW: '欧洲之翼', DY: '挪威航空',
    EK: '阿联酋航空', QR: '卡塔尔航空', EY: '阿提哈德航空', SQ: '新加坡航空', TG: '泰国国际航空', MH: '马来西亚航空', GA: '印尼鹰航',
    VN: '越南航空', PR: '菲律宾航空', NH: '全日空', JL: '日本航空', KE: '大韩航空', OZ: '韩亚航空', AI: '印度航空',
    QF: '澳洲航空', NZ: '新西兰航空', AA: '美国航空', UA: '美国联合航空', DL: '达美航空', AC: '加拿大航空', ET: '埃塞俄比亚航空',
  };

  // ── Airports: the names people actually use ("Beijing Capital", "北京首都"), not the official long form ──
  const AP_NAMES = {
    // Mainland China, Hong Kong, Macau, Taiwan
    PEK: ['Beijing Capital', '北京首都'], PKX: ['Beijing Daxing', '北京大兴'], PVG: ['Shanghai Pudong', '上海浦东'], SHA: ['Shanghai Hongqiao', '上海虹桥'],
    CAN: ['Guangzhou Baiyun', '广州白云'], SZX: ["Shenzhen Bao'an", '深圳宝安'], CTU: ['Chengdu Shuangliu', '成都双流'], TFU: ['Chengdu Tianfu', '成都天府'],
    CKG: ['Chongqing Jiangbei', '重庆江北'], KMG: ['Kunming Changshui', '昆明长水'], XIY: ["Xi'an Xianyang", '西安咸阳'], HGH: ['Hangzhou Xiaoshan', '杭州萧山'],
    NKG: ['Nanjing Lukou', '南京禄口'], WUH: ['Wuhan Tianhe', '武汉天河'], CSX: ['Changsha Huanghua', '长沙黄花'], XMN: ['Xiamen Gaoqi', '厦门高崎'],
    FOC: ['Fuzhou Changle', '福州长乐'], TAO: ['Qingdao Jiaodong', '青岛胶东'], TNA: ['Jinan Yaoqiang', '济南遥墙'], CGO: ['Zhengzhou Xinzheng', '郑州新郑'],
    TSN: ['Tianjin Binhai', '天津滨海'], SHE: ['Shenyang Taoxian', '沈阳桃仙'], DLC: ['Dalian Zhoushuizi', '大连周水子'], HRB: ['Harbin Taiping', '哈尔滨太平'],
    CGQ: ['Changchun Longjia', '长春龙嘉'], URC: ['Ürümqi Tianshan', '乌鲁木齐天山'], LHW: ['Lanzhou Zhongchuan', '兰州中川'], KWE: ['Guiyang Longdongbao', '贵阳龙洞堡'],
    NNG: ['Nanning Wuxu', '南宁吴圩'], KWL: ['Guilin Liangjiang', '桂林两江'], HAK: ['Haikou Meilan', '海口美兰'], SYX: ['Sanya Phoenix', '三亚凤凰'],
    HFE: ['Hefei Xinqiao', '合肥新桥'], KHN: ['Nanchang Changbei', '南昌昌北'], TYN: ['Taiyuan Wusu', '太原武宿'], SJW: ['Shijiazhuang Zhengding', '石家庄正定'],
    HET: ['Hohhot Baita', '呼和浩特白塔'], INC: ['Yinchuan Hedong', '银川河东'], XNN: ['Xining Caojiabao', '西宁曹家堡'], LXA: ['Lhasa Gonggar', '拉萨贡嘎'],
    WNZ: ['Wenzhou Longwan', '温州龙湾'], NGB: ['Ningbo Lishe', '宁波栎社'], JJN: ['Quanzhou Jinjiang', '泉州晋江'], ZUH: ['Zhuhai Jinwan', '珠海金湾'],
    SWA: ['Jieyang Chaoshan', '揭阳潮汕'], YNT: ['Yantai Penglai', '烟台蓬莱'], WEH: ['Weihai Dashuibo', '威海大水泊'], LJG: ['Lijiang Sanyi', '丽江三义'],
    JHG: ['Xishuangbanna Gasa', '西双版纳嘎洒'], DLU: ['Dali', '大理'], DYG: ['Zhangjiajie Hehua', '张家界荷花'], CZX: ['Changzhou Benniu', '常州奔牛'],
    WUX: ['Wuxi Shuofang', '无锡硕放'], NTG: ['Nantong Xingdong', '南通兴东'], YTY: ['Yangzhou Taizhou', '扬州泰州'], XUZ: ['Xuzhou Guanyin', '徐州观音'],
    YIW: ['Yiwu', '义乌'], HSN: ['Zhoushan Putuoshan', '舟山普陀山'], YIH: ['Yichang Sanxia', '宜昌三峡'], TXN: ['Huangshan Tunxi', '黄山屯溪'],
    JZH: ['Jiuzhai Huanglong', '九寨黄龙'], KHG: ['Kashgar', '喀什'], BAV: ['Baotou', '包头'], DSN: ['Ordos Ejin Horo', '鄂尔多斯伊金霍洛'], HLD: ['Hailar Dongshan', '海拉尔东山'],
    LYI: ['Linyi Qiyang', '临沂启阳'], ZHA: ['Zhanjiang Wuchuan', '湛江吴川'], MIG: ['Mianyang Nanjiao', '绵阳南郊'], LZO: ['Luzhou Yunlong', '泸州云龙'],
    HKG: ['Hong Kong', '香港'], MFM: ['Macau', '澳门'], TPE: ['Taipei Taoyuan', '台北桃园'], TSA: ['Taipei Songshan', '台北松山'], KHH: ['Kaohsiung', '高雄'],
    // Rest of Asia, Middle East, Russia
    HND: ['Tokyo Haneda', '东京羽田'], NRT: ['Tokyo Narita', '东京成田'], KIX: ['Osaka Kansai', '大阪关西'], ITM: ['Osaka Itami', '大阪伊丹'],
    NGO: ['Nagoya Chubu', '名古屋中部'], CTS: ['Sapporo New Chitose', '札幌新千岁'], FUK: ['Fukuoka', '福冈'], OKA: ['Okinawa Naha', '冲绳那霸'],
    ICN: ['Seoul Incheon', '首尔仁川'], GMP: ['Seoul Gimpo', '首尔金浦'], PUS: ['Busan Gimhae', '釜山金海'], CJU: ['Jeju', '济州'],
    SIN: ['Singapore Changi', '新加坡樟宜'], BKK: ['Bangkok Suvarnabhumi', '曼谷素万那普'], DMK: ['Bangkok Don Mueang', '曼谷廊曼'], HKT: ['Phuket', '普吉'],
    CNX: ['Chiang Mai', '清迈'], KUL: ['Kuala Lumpur', '吉隆坡'], CGK: ['Jakarta Soekarno–Hatta', '雅加达苏加诺-哈达'], DPS: ['Bali Denpasar', '巴厘岛登巴萨'],
    MNL: ['Manila', '马尼拉'], SGN: ['Ho Chi Minh City Tan Son Nhat', '胡志明市新山一'], HAN: ['Hanoi Noi Bai', '河内内排'], DAD: ['Da Nang', '岘港'],
    PNH: ['Phnom Penh', '金边'], REP: ['Siem Reap', '暹粒'], RGN: ['Yangon', '仰光'], KTM: ['Kathmandu', '加德满都'], CMB: ['Colombo', '科伦坡'], MLE: ['Malé', '马累'],
    DEL: ['Delhi', '德里'], BOM: ['Mumbai', '孟买'], ULN: ['Ulaanbaatar', '乌兰巴托'], ALA: ['Almaty', '阿拉木图'], TAS: ['Tashkent', '塔什干'],
    DXB: ['Dubai', '迪拜'], DWC: ['Dubai World Central', '迪拜世界中心'], AUH: ['Abu Dhabi', '阿布扎比'], DOH: ['Doha Hamad', '多哈哈马德'],
    IST: ['Istanbul', '伊斯坦布尔'], SAW: ['Istanbul Sabiha Gökçen', '伊斯坦布尔萨比哈·格克琴'], TLV: ['Tel Aviv Ben Gurion', '特拉维夫本·古里安'], CAI: ['Cairo', '开罗'],
    SVO: ['Moscow Sheremetyevo', '莫斯科谢列梅捷沃'], DME: ['Moscow Domodedovo', '莫斯科多莫杰多沃'], VKO: ['Moscow Vnukovo', '莫斯科伏努科沃'], LED: ['St Petersburg Pulkovo', '圣彼得堡普尔科沃'],
    // Europe
    AMS: ['Amsterdam Schiphol', '阿姆斯特丹史基浦'], EIN: ['Eindhoven', '埃因霍温'], RTM: ['Rotterdam The Hague', '鹿特丹海牙'], GRQ: ['Groningen Eelde', '格罗宁根伊尔德'],
    LHR: ['London Heathrow', '伦敦希思罗'], LGW: ['London Gatwick', '伦敦盖特威克'], STN: ['London Stansted', '伦敦斯坦斯特德'], LTN: ['London Luton', '伦敦卢顿'], LCY: ['London City', '伦敦城市'],
    MAN: ['Manchester', '曼彻斯特'], EDI: ['Edinburgh', '爱丁堡'], DUB: ['Dublin', '都柏林'],
    CDG: ['Paris Charles de Gaulle', '巴黎戴高乐'], ORY: ['Paris Orly', '巴黎奥利'], BVA: ['Paris Beauvais', '巴黎博韦'], LYS: ['Lyon Saint-Exupéry', '里昂圣埃克苏佩里'],
    NCE: ["Nice Côte d'Azur", '尼斯蔚蓝海岸'], MRS: ['Marseille Provence', '马赛普罗旺斯'], TLS: ['Toulouse Blagnac', '图卢兹布拉尼亚克'], MPL: ['Montpellier', '蒙彼利埃'], BOD: ['Bordeaux', '波尔多'],
    FRA: ['Frankfurt', '法兰克福'], MUC: ['Munich', '慕尼黑'], BER: ['Berlin Brandenburg', '柏林勃兰登堡'], DUS: ['Düsseldorf', '杜塞尔多夫'], HAM: ['Hamburg', '汉堡'],
    CGN: ['Cologne Bonn', '科隆/波恩'], STR: ['Stuttgart', '斯图加特'], BRU: ['Brussels', '布鲁塞尔'], CRL: ['Brussels Charleroi', '布鲁塞尔沙勒罗瓦'], LUX: ['Luxembourg', '卢森堡'],
    ZRH: ['Zurich', '苏黎世'], GVA: ['Geneva', '日内瓦'], BSL: ['Basel-Mulhouse', '巴塞尔-米卢斯'], VIE: ['Vienna', '维也纳'], PRG: ['Prague', '布拉格'],
    BUD: ['Budapest', '布达佩斯'], WAW: ['Warsaw Chopin', '华沙肖邦'], KRK: ['Kraków', '克拉科夫'], CPH: ['Copenhagen', '哥本哈根'], ARN: ['Stockholm Arlanda', '斯德哥尔摩阿兰达'],
    OSL: ['Oslo Gardermoen', '奥斯陆加勒穆恩'], HEL: ['Helsinki', '赫尔辛基'], KEF: ['Reykjavík Keflavík', '雷克雅未克凯夫拉维克'],
    MAD: ['Madrid Barajas', '马德里巴拉哈斯'], BCN: ['Barcelona El Prat', '巴塞罗那埃尔普拉特'], SVQ: ['Seville', '塞维利亚'], AGP: ['Málaga', '马拉加'], VLC: ['Valencia', '瓦伦西亚'],
    PMI: ['Palma de Mallorca', '帕尔马'], LIS: ['Lisbon', '里斯本'], OPO: ['Porto', '波尔图'], FCO: ['Rome Fiumicino', '罗马菲乌米奇诺'], CIA: ['Rome Ciampino', '罗马钱皮诺'],
    MXP: ['Milan Malpensa', '米兰马尔彭萨'], LIN: ['Milan Linate', '米兰利纳特'], BGY: ['Milan Bergamo', '米兰贝加莫'], VCE: ['Venice Marco Polo', '威尼斯马可波罗'],
    NAP: ['Naples', '那不勒斯'], FLR: ['Florence', '佛罗伦萨'], BLQ: ['Bologna', '博洛尼亚'], ATH: ['Athens', '雅典'],
    // Americas, Oceania, Africa
    JFK: ['New York JFK', '纽约肯尼迪'], EWR: ['Newark', '纽瓦克'], LGA: ['New York LaGuardia', '纽约拉瓜迪亚'], LAX: ['Los Angeles', '洛杉矶'], SFO: ['San Francisco', '旧金山'],
    SEA: ['Seattle–Tacoma', '西雅图'], ORD: ["Chicago O'Hare", '芝加哥奥黑尔'], BOS: ['Boston Logan', '波士顿洛根'], IAD: ['Washington Dulles', '华盛顿杜勒斯'], DCA: ['Washington Reagan', '华盛顿里根'],
    ATL: ['Atlanta', '亚特兰大'], DFW: ['Dallas/Fort Worth', '达拉斯-沃斯堡'], IAH: ['Houston Bush', '休斯敦布什'], MIA: ['Miami', '迈阿密'], LAS: ['Las Vegas', '拉斯维加斯'], DEN: ['Denver', '丹佛'],
    HNL: ['Honolulu', '檀香山'], YVR: ['Vancouver', '温哥华'], YYZ: ['Toronto Pearson', '多伦多皮尔逊'], YUL: ['Montréal Trudeau', '蒙特利尔特鲁多'], MEX: ['Mexico City', '墨西哥城'],
    GRU: ['São Paulo Guarulhos', '圣保罗瓜鲁柳斯'], SYD: ['Sydney', '悉尼'], MEL: ['Melbourne', '墨尔本'], BNE: ['Brisbane', '布里斯班'], PER: ['Perth', '珀斯'], AKL: ['Auckland', '奥克兰'],
    JNB: ['Johannesburg', '约翰内斯堡'], ADD: ['Addis Ababa', '亚的斯亚贝巴'], NBO: ['Nairobi', '内罗毕'],
  };
  // Name for any other airport: the official name without "International Airport" and the like (a lone surname gets its city)
  function shortAirportName(ap) {
    const city = String(ap.city || '').trim();
    let n = String(ap.name || '').replace(/\b(International|Intl\.?|Regional|Municipal)\b/gi, '').replace(/\b(Airport|Airfield|Aeroporto|Aéroport|Aeropuerto|Flughafen|Luchthaven|Lufthavn|Flygplats|Lotnisko)\b/gi, '')
      .replace(/\s*[-–]\s*$/, '').replace(/\s{2,}/g, ' ').trim();
    if (!n) return city || ap.iata || '';
    const f4 = x => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 4);
    if (city && n.split(/[\s-]+/).length === 1 && f4(n) !== f4(city)) n = `${city} ${n}`;   // "Kotoka" becomes "Accra Kotoka"
    return n;
  }
  function airportName(ap, lang) {
    if (!ap) return '';
    const k = AP_NAMES[String(ap.iata || '').toUpperCase()];
    if (k) return lang === 'zh' ? k[1] : k[0];
    return lang === 'zh' && ap.city_zh ? ap.city_zh : shortAirportName(ap);
  }

  // ── Airlines flown: a short profile for the detail page [founded, base, alliance, note en, note zh] ──
  const AIRLINE_INFO = {
    CA: { founded: 1988, base: 'Beijing Capital (PEK)', alliance: 'Star Alliance', en: "China's flag carrier, headquartered in Beijing. Its red phoenix emblem is a stylised \"VIP\"; the fleet spans A320s to A350s and 777-300ERs.", zh: '中国的载旗航空公司，总部北京。尾翼红色凤凰由艺术化的 "VIP" 字母组成；机队从 A320 到 A350、777-300ER。' },
    CZ: { founded: 1988, base: 'Guangzhou Baiyun (CAN)', alliance: '—', en: 'The largest airline in China by fleet size, based in Guangzhou. The kapok flower on the blue tail is the city flower of Guangzhou.', zh: '按机队规模是中国最大的航空公司，基地广州。蓝色尾翼上的木棉花是广州市花。' },
    MU: { founded: 1988, base: 'Shanghai Hongqiao / Pudong', alliance: 'SkyTeam', en: 'Shanghai-based carrier; the 2014 livery shows a swallow inside a red wing, a nod to the old China Eastern mark.', zh: '总部上海；2014 年新涂装的尾翼是红色翅膀环绕深蓝燕子，延续了东航的燕子传统。' },
    MF: { founded: 1984, base: 'Xiamen Gaoqi (XMN)', alliance: 'SkyTeam', en: 'Boeing-only fleet from Xiamen; the white egret on the blue tail is the city bird of Xiamen.', zh: '来自厦门的全波音机队航司；蓝色尾翼上的白鹭是厦门市鸟。' },
    TV: { founded: 2010, base: 'Lhasa Gonggar (LXA) / Chengdu', alliance: '—', en: 'The first airline based on the Tibetan plateau; its ribbon livery is a khata, the Tibetan ceremonial scarf.', zh: '第一家以青藏高原为基地的航空公司，彩带涂装取自藏族的哈达。' },
    JD: { founded: 1995, base: 'Beijing Daxing (PKX)', alliance: '—', en: 'Beijing Capital Airlines, an HNA Group carrier; the golden dragon on a red tail is the HNA family look.', zh: '北京首都航空，海航集团成员；红尾金龙是海航系的家族风格。' },
    KY: { founded: 2007, base: 'Kunming Changshui (KMG)', alliance: '—', en: 'Yunnan-based 737 operator; the golden peacock feathers on the red tail refer to the Dai peacock dance of Yunnan.', zh: '云南的全 737 机队航司；红尾翼上的金色孔雀翎取自云南傣族孔雀舞。' },
    GJ: { founded: 2011, base: 'Hangzhou Xiaoshan (HGH)', alliance: '—', en: 'Zhejiang Loong Airlines, from Hangzhou; the sky-blue livery carries a red Chinese dragon (loong).', zh: '浙江长龙航空，基地杭州；天蓝色涂装配红色中国龙。' },
    '9C': { founded: 2004, base: 'Shanghai Hongqiao (SHA)', alliance: '—', en: "China's first low-cost airline; the three S of its green emblem stand for smile, service and security.", zh: '中国第一家低成本航空公司；绿色标志里的三个 S 代表微笑、服务、安全。' },
    CN: { founded: 2007, base: 'Beijing Capital (PEK)', alliance: '—', en: 'Grand China Air, an HNA Group carrier; red rear fuselage and golden roc like its sister Hainan Airlines.', zh: '大新华航空，海航集团成员；红色后机身与金色大鹏与姊妹公司海南航空一脉相承。' },
    NH: { founded: 1952, base: 'Tokyo Haneda / Narita', alliance: 'Star Alliance', en: "Japan's largest airline; the Triton-blue and Mohican-blue tail band dates from 1983.", zh: '日本最大的航空公司；尾翼上的两种蓝色（Triton 蓝与 Mohican 蓝）始于 1983 年。' },
    QR: { founded: 1993, base: 'Doha Hamad (DOH)', alliance: 'oneworld', en: 'State carrier of Qatar; the oryx on the burgundy tail is the national animal.', zh: '卡塔尔国家航空公司；酒红色尾翼上的羚羊（阿拉伯大羚羊）是卡塔尔国兽。' },
    BA: { founded: 1974, base: 'London Heathrow (LHR)', alliance: 'oneworld', en: "The UK's flag carrier; the waving Union Flag tail is the \"Chatham Dockyard\" design of 1997.", zh: '英国载旗航空公司；尾翼上飘动的米字旗是 1997 年的 "Chatham Dockyard" 设计。' },
    KL: { founded: 1919, base: 'Amsterdam Schiphol (AMS)', alliance: 'SkyTeam', en: 'The oldest airline still operating under its original name; the crown logo and KLM blue have been in use since the 1960s.', zh: '世界上仍以原名运营的最古老航空公司；皇冠标志与 KLM 蓝自 1960 年代沿用至今。' },
    TO: { founded: 2007, base: 'Paris Orly (ORY)', alliance: '—', en: 'Transavia France, the low-cost arm of Air France-KLM, with the green "t" tail.', zh: '法国泛航航空，法航-荷航集团的低成本子公司，绿色 "t" 尾翼。' },
    HV: { founded: 1966, base: 'Amsterdam Schiphol (AMS)', alliance: '—', en: 'Transavia, KLM\'s Dutch low-cost sister, with the green "t" tail.', zh: '泛航航空，荷航的荷兰低成本姊妹公司，绿色 "t" 尾翼。' },
    OS: { founded: 1957, base: 'Vienna (VIE)', alliance: 'Star Alliance', en: "Austria's flag carrier, part of the Lufthansa Group; the red-white-red tail is the Austrian flag with the chevron arrow.", zh: '奥地利载旗航空公司，汉莎集团成员；红白红尾翼是奥地利国旗加箭头标志。' },
    FR: { founded: 1984, base: 'Dublin (DUB)', alliance: '—', en: "Europe's largest airline by passengers; the winged harp on the navy tail is an Irish symbol.", zh: '按客运量是欧洲最大的航空公司；深蓝尾翼上的带翼竖琴是爱尔兰的象征。' },
    VY: { founded: 2004, base: 'Barcelona El Prat (BCN)', alliance: '—', en: 'Spanish low-cost carrier of the IAG group, with the grey dot pattern and yellow accent.', zh: 'IAG 集团旗下的西班牙低成本航空公司，灰色圆点图案配黄色点缀。' },
  };
  const airlineInfo = iata => AIRLINE_INFO[String(iata || '').toUpperCase()] || null;

  // ── Distance and time ──
  const R = 6371.0088, rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  function distKm(a, b) {
    if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number') return 0;
    const p1 = rad(a.lat), p2 = rad(b.lat), dp = p2 - p1, dl = rad(b.lon - a.lon);
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  // Block time estimate when none was entered: ~30 min taxi/climb plus cruise at ~830 km/h
  const estMinutes = km => km ? Math.round(30 + km / 830 * 60) : 0;
  // Points along the great circle, longitudes unwrapped so the line never jumps across the map
  function greatCircle(a, b, n = 64) {
    const p1 = rad(a.lat), l1 = rad(a.lon), p2 = rad(b.lat), l2 = rad(b.lon);
    const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
    if (!d) return [[a.lat, a.lon], [b.lat, b.lon]];
    const out = []; let prev = null;
    for (let i = 0; i <= n; i++) {
      const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
      const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
      const z = A * Math.sin(p1) + B * Math.sin(p2);
      let lon = deg(Math.atan2(y, x)); const lat = deg(Math.atan2(z, Math.sqrt(x * x + y * y)));
      if (prev !== null) { while (lon - prev > 180) lon -= 360; while (lon - prev < -180) lon += 360; }
      prev = lon; out.push([lat, lon]);
    }
    return out;
  }

  // ── Names ──
  const type = code => BY_CODE.get(String(code || '').toUpperCase()) || null;
  const mfrName = (m, lang) => lang === 'zh' ? (MFR_ZH[m] || m) : m;
  function typeName(code, lang, fallback) {
    const t = type(code); if (!t) return fallback || code || '';
    if (lang !== 'zh') return t.name;
    return (MFR_ZH[t.mfr] || t.mfr) + t.name.replace(/^(Airbus|Boeing|COMAC|Embraer|Bombardier|De Havilland|ATR|Fokker)\s+/, '');   // 波音777-300ER, 空客A350-900
  }
  const airlineName = (al, lang) => !al ? '' : (lang === 'zh' ? (al.zh || AIRLINE_ZH[al.iata] || al.name || al.iata || '') : (al.name || al.iata || ''));
  // Country of an airport for statistics: Hong Kong, Macau and Taiwan count as China
  const statCC = cc => ({ TW: 'CN', HK: 'CN', MO: 'CN' })[String(cc || '').toUpperCase()] || String(cc || '').toUpperCase();
  const DN = {};
  function countryName(cc, lang) {
    cc = String(cc || '').toUpperCase(); if (!cc) return '';
    if (cc === 'CN') return lang === 'zh' ? '中国' : 'China';
    try { DN[lang] ||= new Intl.DisplayNames([lang === 'zh' ? 'zh-Hans' : 'en'], { type: 'region' }); return DN[lang].of(cc) || cc; } catch (e) { return cc; }
  }

  // ── Blueprint silhouettes (top view, nose up) for when WebGL is not available ──
  function silhouette(body) {
    const wide = body === 'wide' || body === 'quad', prop = body === 'turboprop', reg = body === 'regional';
    const fw = wide ? 6 : 4.2, x0 = 50 - fw, x1 = 50 + fw;
    const fus = `M50 5 C${50 + fw * 0.7} 5 ${x1} 10 ${x1} 18 L${x1} 80 L${50 + fw * 0.45} 93 L${50 - fw * 0.45} 93 L${x0} 80 L${x0} 18 C${x0} 10 ${50 - fw * 0.7} 5 50 5 Z`;
    const span = wide ? 46 : reg ? 34 : 40;
    const wing = prop
      ? `M${x0} 37 L${50 - span} 38 L${50 - span} 44 L${x0} 46 Z M${x1} 37 L${50 + span} 38 L${50 + span} 44 L${x1} 46 Z`
      : `M${x0} 36 L${50 - span} ${wide ? 58 : 56} L${50 - span} ${wide ? 62 : 60} L${x0} 52 Z M${x1} 36 L${50 + span} ${wide ? 58 : 56} L${50 + span} ${wide ? 62 : 60} L${x1} 52 Z`;
    const tail = `M${x0 + 1} 78 L${50 - (wide ? 16 : 13)} 88 L${50 - (wide ? 16 : 13)} 91 L${x0 + 1} 87 Z M${x1 - 1} 78 L${50 + (wide ? 16 : 13)} 88 L${50 + (wide ? 16 : 13)} 91 L${x1 - 1} 87 Z`;
    const eng = (x, y, w, h) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="${w / 2}"/>`;
    let engines = '';
    if (prop) engines = [30, 70].map(x => eng(x, 33, 4, 10) + `<path d="M${x - 6} 33 H${x + 6}"/>`).join('');
    else if (body === 'quad') engines = [24, 36, 64, 76].map((x, i) => eng(x, (i === 0 || i === 3) ? 50 : 44, 4.4, 10)).join('');
    else if (reg) engines = eng(x0 - 2.5, 72, 3.4, 8) + eng(x1 + 2.5, 72, 3.4, 8);
    else engines = eng(wide ? 31 : 33, wide ? 45 : 44, wide ? 5.4 : 4.2, wide ? 11 : 9) + eng(wide ? 69 : 67, wide ? 45 : 44, wide ? 5.4 : 4.2, wide ? 11 : 9);
    return `<svg class="ac-sil" viewBox="0 0 100 100" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="0.9" stroke-linejoin="round" aria-hidden="true">
      <path d="M50 2 V98 M2 50 H98" stroke-opacity="0.18" stroke-dasharray="1.5 2" fill="none"/>
      <path d="${wing}"/><path d="${tail}"/><path d="${fus}"/><g>${engines}</g></svg>`;
  }

  window.Aviation = { TYPES, type, typeName, mfrName, airlineName, airportName, airlineInfo, AIRLINE_ZH, countryName, statCC, distKm, estMinutes, greatCircle, silhouette };
})();
