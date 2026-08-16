'use strict';
const express = require('express');
const axios   = require('axios');
const http    = require('http');
const path    = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(__dirname));

/* ═══════════════════════════════════════════════════════════
   SECTOR KEYWORD CLASSIFICATION
   Used to classify all 2,400+ NSE stocks into sectors
   by matching company names when Nifty 500 industry isn't available.
═══════════════════════════════════════════════════════════ */
const SECTOR_KEYWORDS = {
    'Financial Services':               ['bank','finance','financial','fintech','nbfc','microfinance','housing finance','insurance','nse','bse','stock exchange','credit','lending'],
    'Information Technology':           ['tech','software','infosys','tcs','wipro','hcl','mphasis','persistent','coforge','ltim','kpit','zensar','hexaware','mastek','niit','rategain'],
    'Healthcare':                       ['pharma','drug','medicine','hospital','health','biocon','labs','life sciences','diagnostic','medic','cipla','sun pharma','lupin','dr reddy','torrent','alkem','auro'],
    'Automobile and Auto Components':   ['motor','automobile','auto','vehicle','tyre','two wheeler','four wheeler','maruti','tata motors','mahindra','hero','bajaj auto','tvs','eicher','mrf','apollo tyre','ceat'],
    'Capital Goods':                    ['engineering','equipment','industrial','machinery','electrical','switchgear','siemens','abb','bharat heavy','crompton','cummins','thermax','voltas'],
    'Fast Moving Consumer Goods':       ['fmcg','consumer','food','beverages','personal care','household','hul','itc','nestle','britannia','dabur','marico','godrej consumer','colgate','emami'],
    'Oil Gas & Consumable Fuels':       ['oil','gas','petroleum','refinery','energy','ongc','reliance ind','bpcl','hpcl','ioc','gail','oil india','vedanta','cairn'],
    'Power':                            ['power','electricity','ntpc','adani green','tata power','torrent power','jsw energy','nhpc','sjvn','ireda','cesc'],
    'Metals & Mining':                  ['steel','metal','mining','aluminium','copper','zinc','iron','tata steel','jsw steel','hindalco','sail','vedanta','nmdc','moil'],
    'Chemicals':                        ['chemical','petrochemi','specialty','agrochem','pesticide','deepak','aarti','clean science','pidilite','navin fluorine','galaxy surfactant'],
    'Construction':                     ['construction','infra','infrastructure','road','highway','builder','ashoka','knr','pnc infra','irb','rvnl','nbcc','hg infra'],
    'Consumer Services':                ['retail','hospitality','hotel','restaurant','tourism','ecommerce','zomato','swiggy','nykaa','trent','avenue supermarts','pvr','inox'],
    'Textiles':                         ['textile','garment','cotton','fabric','fibre','yarn','polyester','raymond','arvind','trident','page industries','welspun','vardhman'],
    'Cement & Building Materials':      ['cement','concrite','building material','ultratech','shree cement','ambuja','acc','ramco','jk cement','dalmia','nuvoco'],
    'Real Estate':                      ['realty','real estate','housing','property','dlf','godrej properties','oberoi','prestige','brigade','sobha','macrotech','phoenix mills'],
    'Sugar':                            ['sugar','sugarcane','molasses','distillery'],
    'Tour & Travel':                    ['aviation','airline','resort','travel','tourism','irctc','indigo','lemon tree','indian hotels','itc hotels','leela','chalet','mhril','wonderla'],
    'Defence & Aerospace':              ['defence','aerospace','shipbuilder','ordnance','warship','hal','bel','bdl','mazagon','grse','cochin shipyard','bharat forge','mtar','paras','astra micro','zen tech','unimech'],
    'Fertilizers':                      ['fertilizer','fertiliser','agri','agrochemical'],
    'Telecom':                          ['telecom','communication','mobile','network','bharti','airtel','vodafone','idea','reliance jio','tata comm','sterlite tech','indus tower'],
};

/* ═══════════════════════════════════════════════════════════
   CUSTOM SECTORS
   Hand-curated sectors with specific stock lists
═══════════════════════════════════════════════════════════ */
const CUSTOM_SECTORS = {
    'Tour & Travel':      ['IRCTC','INDIGO','EASEMYTRIP','YATRA','RATEGAIN','INDHOTEL','ITCHOTELS','THELEELA','CHALET','LEMONTREE','MHRIL','WONDERLA','TFCILTD','GMRAIRPORT','SAMHI','ROHLTD','TAJGVK','PARKHOTELS','JUNIPER','AHLEAST','CORDELIA','EIHAHOTELS','KAMATHOTEL','ITDC'],
    'Defence & Aerospace':['HAL','BEL','BDL','MAZDOCK','GRSE','COCHINSHIP','BHARATFORG','DATAPATTNS','MIDHANI','PARAS','ASTRAMICRO','ZENTEC','APOLLO','SOLARINDS','PREMEXPLN','IDEAFORGE','UNIMECH','KAVDEFENCE','KRISHNADEF','DYNAMATECH'],
    'Sugar':              ['ANDHRSUGAR','AVADHSUGAR','BAJAJHIND','BANARISUG','DALMIASUG','DHAMPURSUG','DWARKESH','MAGADSUGAR','MAWANASUG','PONNIERODE','RAJSREESUG','RANASUG','RENUKA','SAKHTISUG','UTTAMSUGAR','UGARSUGAR','VISHWARAJ','KMSUGAR','KOTARISUG'],
    'Textiles':           ['PAGEIND','RAYMOND','ARVIND','TRIDENT','WELSPUNIND','VARDHMAN','RUPA','SPORTKING','SUTLEJ','HIMATSEIDE'],
    'Cement':             ['ULTRACEMCO','SHREECEM','AMBUJACEM','ACC','RAMCOCEM','JKCEMENT','HEIDELBERG','INDIACEM','ORIENTCEM','NUVOCO'],
    'Real Estate':        ['DLF','GODREJPROP','OBEROIRLTY','PRESTIGE','BRIGADE','SOBHA','PHOENIXLTD','KOLTEPATIL','SUNTECK','ANANTRAJ'],
    'Fertilizers':        ['NFL','GNFC','DEEPAKFERT','COROMANDEL','GSFC','CHAMBLFERT','FACT','KSCL'],
};

const CUSTOM_STOCK_NAMES = {
    'HAL':'Hindustan Aeronautics Ltd','BEL':'Bharat Electronics Ltd','BDL':'Bharat Dynamics Ltd',
    'MAZDOCK':'Mazagon Dock Shipbuilders','GRSE':'Garden Reach Shipbuilders','COCHINSHIP':'Cochin Shipyard Ltd',
    'BHARATFORG':'Bharat Forge Ltd','DATAPATTNS':'Data Patterns (India)','MIDHANI':'Mishra Dhatu Nigam Ltd',
    'PARAS':'Paras Defence & Space Tech','ASTRAMICRO':'Astra Microwave Products','ZENTEC':'Zen Technologies Ltd',
    'APOLLO':'Apollo Micro Systems Ltd','SOLARINDS':'Solar Industries India','PREMEXPLN':'Premier Explosives Ltd',
    'IDEAFORGE':'ideaForge Technology Ltd','UNIMECH':'Unimech Aerospace & Mfg','KAVDEFENCE':'Kavveri Defence & Wireless',
    'KRISHNADEF':'Krishna Defence & Allied','DYNAMATECH':'Dynamatic Technologies',
    'ANDHRSUGAR':'The Andhra Sugars Ltd','AVADHSUGAR':'Avadh Sugar & Energy','BAJAJHIND':'Bajaj Hindusthan Sugar',
    'BANARISUG':'Bannari Amman Sugars','DALMIASUG':'Dalmia Bharat Sugar','DHAMPURSUG':'Dhampur Sugar Mills',
    'DWARKESH':'Dwarikesh Sugar Industries','MAGADSUGAR':'Magadh Sugar & Energy','MAWANASUG':'Mawana Sugars Ltd',
    'PONNIERODE':'Ponni Sugars (Erode)','RAJSREESUG':'Rajshree Sugars & Chemicals','RANASUG':'Rana Sugars Ltd',
    'RENUKA':'Shree Renuka Sugars','SAKHTISUG':'Sakthi Sugars Ltd','UTTAMSUGAR':'Uttam Sugar Mills',
    'UGARSUGAR':'The Ugar Sugar Works','VISHWARAJ':'Vishwaraj Sugar Industries','KMSUGAR':'K.M.Sugar Mills',
    'KOTARISUG':'Kothari Sugars & Chemicals',
    'IRCTC':'Indian Railway Catering & Tourism','INDIGO':'IndiGo (InterGlobe Aviation)',
    'EASEMYTRIP':'EaseMyTrip','YATRA':'Yatra Online Ltd','RATEGAIN':'RateGain Travel Technologies',
    'INDHOTEL':'The Indian Hotels (Taj)','ITCHOTELS':'ITC Hotels Ltd','THELEELA':'Leela Palaces Hotels & Resorts',
    'CHALET':'Chalet Hotels Ltd','LEMONTREE':'Lemon Tree Hotels','MHRIL':'Mahindra Holidays & Resorts',
    'WONDERLA':'Wonderla Holidays','TFCILTD':'Tourism Finance Corp of India','GMRAIRPORT':'GMR Airports Ltd',
    'SAMHI':'Samhi Hotels Ltd','ROHLTD':'Royal Orchid Hotels','TAJGVK':'Taj GVK Hotels & Resorts',
    'PARKHOTELS':'Apeejay Surrendra Park Hotels','JUNIPER':'Juniper Hotels Ltd','AHLEAST':'Asian Hotels (East)',
    'CORDELIA':'Waterways Leisure Tourism','EIHAHOTELS':'EIH Associated Hotels',
    'KAMATHOTEL':'Kamat Hotels India','ITDC':'India Tourism Development Corp',
    'DEEPAKFERT':'Deepak Fertilisers','COROMANDEL':'Coromandel International',
    'GSFC':'Gujarat State Fertilizers','CHAMBLFERT':'Chambal Fertilisers Ltd',
    'FACT':'Fertilisers & Chemicals','KSCL':'Kaveri Seed Company',
};

/* ═══════════════════════════════════════════════════════════
   HELPER: Fetch one stock quote from Yahoo Finance
═══════════════════════════════════════════════════════════ */
const _failLog = {};

async function fetchOneQuote(symbol) {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    try {
        const resp = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
            timeout: 8000,
        });
        const result = resp.data?.chart?.result?.[0];
        if (!result || resp.data?.chart?.error) throw new Error(resp.data?.chart?.error?.code || 'No data');
        const meta   = result.meta;
        const closes = result?.indicators?.quote?.[0]?.close || [];
        const validC = closes.filter(c => c != null);
        const price  = meta?.regularMarketPrice ?? validC[validC.length - 1];
        const prev   = validC.length >= 2 ? validC[validC.length - 2]
                     : (meta?.chartPreviousClose || meta?.previousClose || price);
        if (price == null) return null;
        return {
            symbol,
            price,
            prevClose: prev,
            high52:    meta?.fiftyTwoWeekHigh  ?? null,
            low52:     meta?.fiftyTwoWeekLow   ?? null,
            changeP:   prev ? ((price - prev) / prev * 100) : null,
            volume:    meta?.regularMarketVolume ?? null,
            currency:  meta?.currency ?? 'INR',
        };
    } catch (e) {
        const now = Date.now();
        if (!_failLog[symbol] || now - _failLog[symbol] > 600000) {
            console.warn(`[Stocks] No data for ${symbol}: ${e.message}`);
            _failLog[symbol] = now;
        }
        return null;
    }
}

/* ═══════════════════════════════════════════════════════════
   API: /api/stocks — live prices for a list of symbols
═══════════════════════════════════════════════════════════ */
app.get('/api/stocks', async (req, res) => {
    const { symbols } = req.query;
    if (!symbols) return res.status(400).json({ error: 'symbols param required' });
    const symList = symbols.split(',').map(s => s.trim()).filter(Boolean);
    const settled = await Promise.allSettled(symList.map(sym => fetchOneQuote(sym)));
    const results = settled.map(r => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean);
    res.json({ results });
});

/* ═══════════════════════════════════════════════════════════
   API: /api/indices — major Indian index prices
═══════════════════════════════════════════════════════════ */
app.get('/api/indices', async (req, res) => {
    const INDEX_SYMS = ['^NSEI','^CNXSC','^NSEBANK','^CNXFIN','^CNXIT','^BSESN','^NSEMDCP50','^CNXAUTO','^CNXPHARMA','^CNXFMCG'];
    const results = [];
    for (const sym of INDEX_SYMS) {
        try {
            const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
            const resp = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, timeout: 8000,
            });
            const result   = resp.data?.chart?.result?.[0];
            const meta     = result?.meta;
            const closes   = result?.indicators?.quote?.[0]?.close || [];
            const validC   = closes.filter(c => c != null);
            const price    = meta?.regularMarketPrice ?? validC[validC.length - 1];
            const prevClose= validC.length >= 2 ? validC[validC.length - 2] : (meta?.chartPreviousClose || price);
            if (meta && price != null) {
                results.push({ symbol: sym, price, change: price - (prevClose||price), changePct: prevClose ? ((price - prevClose) / prevClose * 100) : 0 });
            }
        } catch (e) { /* skip */ }
    }
    res.json({ results });
});

/* ═══════════════════════════════════════════════════════════
   API: /api/history — OHLCV for candlestick chart
═══════════════════════════════════════════════════════════ */
app.get('/api/history', async (req, res) => {
    const { symbol, range = '1mo' } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    const intervalMap = { '5d': '15m', '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1wk', '2y': '1wk' };
    try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${intervalMap[range]||'1d'}&range=${range}`;
        const resp = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, timeout: 10000 });
        const result = resp.data?.chart?.result?.[0];
        const ts     = result?.timestamp || [];
        const q      = result?.indicators?.quote?.[0] || {};
        const candles = [];
        for (let i = 0; i < ts.length; i++) {
            if (q.close?.[i] == null) continue;
            candles.push({ t: ts[i]*1000, o: q.open?.[i]??q.close[i], h: q.high?.[i]??q.close[i], l: q.low?.[i]??q.close[i], c: q.close[i], v: q.volume?.[i]??0 });
        }
        res.json({ symbol, range, candles, prices: candles.map(c => Math.round(c.c*100)/100) });
    } catch (e) {
        res.json({ symbol, range, candles: [], prices: [] });
    }
});

/* ═══════════════════════════════════════════════════════════
   API: /api/financials — PE, EPS, shareholding, quarterly results
═══════════════════════════════════════════════════════════ */
let _yfCrumb = null, _yfCookies = null, _crumbExpiry = 0;

async function getYahooCrumb() {
    if (_yfCrumb && Date.now() < _crumbExpiry) return { crumb: _yfCrumb, cookies: _yfCookies };
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const visit = await axios.get('https://finance.yahoo.com', { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, timeout: 12000, maxRedirects: 5, responseType: 'text' });
    const rawCookies = (visit.headers['set-cookie'] || []).map(c => c.split(';')[0].trim()).filter(c => /^(A1|A1S|A3)=/.test(c)).join('; ');
    if (!rawCookies) throw new Error('No Yahoo cookies');
    const crumbResp = await axios.get('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, 'Cookie': rawCookies, 'Referer': 'https://finance.yahoo.com/' }, timeout: 8000, responseType: 'text' });
    const crumb = typeof crumbResp.data === 'string' ? crumbResp.data.trim() : '';
    if (!crumb || crumb.includes('{')) throw new Error('Invalid crumb');
    _yfCrumb = crumb; _yfCookies = rawCookies; _crumbExpiry = Date.now() + 55*60*1000;
    console.log(`[YF Crumb] OK (${crumb.slice(0,8)}…)`);
    return { crumb: _yfCrumb, cookies: _yfCookies };
}

app.get('/api/financials', async (req, res) => {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    try {
        const { crumb, cookies } = await getYahooCrumb();
        const modules = 'financialData,defaultKeyStatistics,summaryDetail,assetProfile,incomeStatementHistoryQuarterly,cashflowStatementHistoryQuarterly,earningsHistory,majorHoldersBreakdown,institutionOwnership,fundOwnership';
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
        const resp = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Cookie': cookies, 'Referer': 'https://finance.yahoo.com/' }, timeout: 10000 });
        const result = resp.data?.quoteSummary?.result?.[0];
        if (!result) return res.status(404).json({ error: 'No data' });
        const fd = result.financialData || {}, ks = result.defaultKeyStatistics || {}, sd = result.summaryDetail || {}, ap = result.assetProfile || {};
        const g = (obj, key) => { const v = obj[key]; if (!v && v !== 0) return null; return typeof v === 'object' ? (v.fmt ?? v.raw ?? null) : v; };
        // FII/DII split
        const io = result.institutionOwnership?.ownershipList || [];
        const fo = result.fundOwnership?.ownershipList || [];
        const mh = result.majorHoldersBreakdown || {};
        const toNum = s => { if (s==null) return null; const n=parseFloat(String(s).replace('%','')); return isNaN(n)?null:n; };
        const foreignKW = ['fidelity','vanguard','blackrock','jp morgan','goldman','morgan stanley','nomura','ubs','deutsche','hsbc','barclays','bnp','aberdeen','schroders','invesco','franklin','templeton','wellington','dimensional','baillie','norges','government pension','gic','temasek','foreign','fpi','fii','overseas','international','global','singapore','sovereign','mauritius','cayman','ireland','luxembourg','fund llc','l.p.','inc.','corp.'];
        const domesticKW= ['sbi','lic','hdfc','icici','axis','kotak','birla','reliance','nippon','dsp','tata','bajaj','mirae','uti','pnb','canara','mutual fund','mf ','india fund','national','state bank','life insurance','insurance company of india','provident','pension fund india','nps'];
        let fiiPct=0, diiPct=0;
        const allInst = [...io,...fo];
        if (allInst.length) {
            allInst.forEach(inst => {
                const name=(inst.organization||'').toLowerCase(), pct=toNum(g(inst,'pctHeld'));
                if (pct==null) return;
                const pv = pct<1?pct*100:pct;
                const isForeign=foreignKW.some(k=>name.includes(k)), isDomestic=domesticKW.some(k=>name.includes(k));
                if (isForeign&&!isDomestic){fiiPct+=pv;}else if(isDomestic){diiPct+=pv;}else{fiiPct+=pv*0.5;diiPct+=pv*0.5;}
            });
            const instNum=toNum(g(mh,'institutionsPercentHeld'));
            if (instNum&&fiiPct+diiPct>0){const s=instNum/(fiiPct+diiPct);fiiPct*=s;diiPct*=s;}
        } else {
            const instNum=toNum(g(mh,'institutionsPercentHeld'));
            if(instNum){fiiPct=instNum*0.55;diiPct=instNum*0.45;}
        }
        // Quarterly
        const quarters=(result.incomeStatementHistoryQuarterly?.incomeStatementHistory||[]).slice(0,6).map((q,i)=>{
            const cf=(result.cashflowStatementHistoryQuarterly?.cashflowStatements||[])[i]||{};
            const gv=(o,k)=>{const v=o[k];if(!v&&v!==0)return null;return typeof v==='object'?(v.fmt??v.raw??null):v;};
            return {period:gv(q,'endDate'),totalRevenue:gv(q,'totalRevenue'),grossProfit:gv(q,'grossProfit'),ebit:gv(q,'ebit'),netIncome:gv(q,'netIncome'),operatingIncome:gv(q,'operatingIncome'),operatingCashflow:gv(cf,'totalCashFromOperatingActivities')};
        });
        const epsHistory=(result.earningsHistory?.history||[]).slice(0,8).map(e=>{
            const gv=(o,k)=>{const v=o[k];if(!v&&v!==0)return null;return typeof v==='object'?(v.fmt??v.raw??null):v;};
            return {quarter:gv(e,'quarter'),epsActual:gv(e,'epsActual'),epsEstimate:gv(e,'epsEstimate'),epsDifference:gv(e,'epsDifference'),surprisePercent:gv(e,'surprisePercent')};
        });
        const insNum=toNum(g(mh,'insidersPercentHeld')), instPctNum=toNum(g(mh,'institutionsPercentHeld'));
        const pubNum=insNum!=null&&instPctNum!=null?Math.max(0,100-insNum-instPctNum):null;
        res.json({
            symbol,
            marketCap:g(sd,'marketCap'),trailingPE:g(sd,'trailingPE'),forwardPE:g(sd,'forwardPE'),
            priceToBook:g(ks,'priceToBook'),enterpriseValue:g(ks,'enterpriseValue'),
            trailingEps:g(ks,'trailingEps'),forwardEps:g(ks,'forwardEps'),
            earningsGrowth:g(fd,'earningsGrowth'),revenueGrowth:g(fd,'revenueGrowth'),
            dividendYield:g(sd,'dividendYield'),dividendRate:g(sd,'dividendRate'),payoutRatio:g(sd,'payoutRatio'),
            bookValue:g(ks,'bookValue'),beta:g(ks,'beta'),
            returnOnEquity:g(fd,'returnOnEquity'),returnOnAssets:g(fd,'returnOnAssets'),
            profitMargins:g(fd,'profitMargins'),grossProfits:g(fd,'grossProfits'),ebitda:g(fd,'ebitda'),
            totalDebt:g(fd,'totalDebt'),totalCash:g(fd,'totalCash'),currentRatio:g(fd,'currentRatio'),debtToEquity:g(fd,'debtToEquity'),
            fiftyDayAverage:g(sd,'fiftyDayAverage'),twoHundredDayAverage:g(sd,'twoHundredDayAverage'),averageVolume:g(sd,'averageVolume'),
            targetMeanPrice:g(fd,'targetMeanPrice'),targetHighPrice:g(fd,'targetHighPrice'),targetLowPrice:g(fd,'targetLowPrice'),
            recommendationKey:g(fd,'recommendationKey'),numberOfAnalysts:g(fd,'numberOfAnalystOpinions'),
            sector:ap.sector||null,industry:ap.industry||null,website:ap.website||null,
            fullTimeEmployees:ap.fullTimeEmployees||null,city:ap.city||null,country:ap.country||null,
            description:ap.longBusinessSummary||null,
            shareholding:{
                insiderPct:g(mh,'insidersPercentHeld'),institutionPct:g(mh,'institutionsPercentHeld'),
                fiiPct:fiiPct>0?fiiPct.toFixed(2)+'%':null,diiPct:diiPct>0?diiPct.toFixed(2)+'%':null,
                publicPct:pubNum!=null?pubNum.toFixed(2)+'%':null,
                isEstimated:allInst.length===0,
                topInstitutions:allInst.slice(0,8).map(i=>({name:i.organization||'—',pctHeld:g(i,'pctHeld'),value:g(i,'value')})),
            },
            quarterlyResults:quarters,epsHistory,
        });
    } catch (e) {
        console.error(`[Financials] ${symbol}:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

/* ═══════════════════════════════════════════════════════════
   API: /api/stock-news — Yahoo Finance RSS news per stock
═══════════════════════════════════════════════════════════ */
app.get('/api/stock-news', async (req, res) => {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    try {
        const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
        const resp = await axios.get(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000, responseType: 'text' });
        const xml = resp.data;
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const items = [];
        let match;
        while ((match = itemRegex.exec(xml)) !== null) {
            const block = match[1];
            const title  = (block.match(/<title><!\[CDATA\[(.*?)\]\]>/) || block.match(/<title>(.*?)<\/title>/) || [])[1] || '';
            const link   = (block.match(/<link>(.*?)<\/link>/) || [])[1] || '';
            const pub    = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
            const source = (block.match(/<source[^>]*>(.*?)<\/source>/) || [])[1] || 'Yahoo Finance';
            const img    = (block.match(/url="(https:\/\/[^"]+\.(jpg|png|webp|jpeg)[^"]*)"/) || [])[1] || '';
            if (title.trim()) items.push({ title: title.trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"'), link: link.trim(), pubDate: pub.trim(), source: source.trim(), image: img });
        }
        // Fallback: ET Markets general news
        if (!items.length) {
            const base = symbol.replace('.NS','').replace('.BO','').toLowerCase();
            const et = await axios.get('https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000, responseType: 'text' });
            const etRegex = /<item>([\s\S]*?)<\/item>/g;
            let em;
            while ((em = etRegex.exec(et.data)) !== null && items.length < 15) {
                const b=em[1];
                const t=(b.match(/<title><!\[CDATA\[(.*?)\]\]>/) || [])[1]||'';
                const d=(b.match(/<description><!\[CDATA\[(.*?)\]\]>/) || [])[1]||'';
                const l=(b.match(/<link>(.*?)<\/link>/) || [])[1]||'';
                const p=(b.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1]||'';
                const img=(b.match(/url="(https:\/\/img\.etimg\.com[^"]+)"/) || [])[1]||'';
                if (t && (t.toLowerCase().includes(base) || d.toLowerCase().includes(base)))
                    items.push({ title: t.trim(), link: l.trim(), pubDate: p.trim(), source: 'Economic Times', image: img });
            }
        }
        res.json({ symbol, items, total: items.length });
    } catch (e) {
        res.json({ symbol, items: [], total: 0, error: e.message });
    }
});

/* ═══════════════════════════════════════════════════════════
   API: /api/et-news — ET Markets general news feed
═══════════════════════════════════════════════════════════ */
app.get('/api/et-news', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit||'20'),30);
    const feeds = [
        'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
        'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
    ];
    const all = [];
    for (const url of feeds) {
        try {
            const r = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000, responseType: 'text' });
            const re = /<item>([\s\S]*?)<\/item>/g;
            let m;
            while ((m = re.exec(r.data)) !== null) {
                const b=m[1];
                const t=(b.match(/<title><!\[CDATA\[(.*?)\]\]>/) || [])[1]||'';
                const l=(b.match(/<link>(.*?)<\/link>/) || [])[1]||'';
                const d=(b.match(/<description><!\[CDATA\[(.*?)\]\]>/) || [])[1]||'';
                const p=(b.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1]||'';
                const img=(b.match(/url="(https:\/\/img\.etimg\.com[^"]+)"/) || [])[1]||'';
                if (t) all.push({ title:t.trim(), link:l.trim(), description:d.replace(/<[^>]+>/g,'').trim().slice(0,300), pubDate:p.trim(), image:img, category:'Markets' });
            }
        } catch (_) {}
    }
    const seen = new Set();
    const items = all.filter(i=>{ if(seen.has(i.link))return false; seen.add(i.link); return true; }).sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate)).slice(0,limit);
    res.json({ items, total: items.length });
});

/* ═══════════════════════════════════════════════════════════
   API: /api/stock-list — full NSE stock list (cached 6h)
═══════════════════════════════════════════════════════════ */
let _stockListCache = null, _stockListTime = 0;

async function getStockList() {
    if (_stockListCache && Date.now() - _stockListTime < 6*60*60*1000) return _stockListCache;
    const resp = await axios.get('https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000, responseType: 'text' });
    const stocks = [];
    resp.data.split('\n').slice(1).forEach(line => {
        const cols=line.split(','); const sym=cols[0]?.trim(), name=cols[1]?.trim();
        if (sym && name && cols[2]?.trim()==='EQ') stocks.push({ symbol: sym+'.NS', name, exchange: 'NSE' });
    });
    Object.entries(CUSTOM_SECTORS).forEach(([sector, syms]) => {
        syms.forEach(s => { if (!stocks.find(x=>x.symbol===s+'.NS')) stocks.push({ symbol:s+'.NS', name:CUSTOM_STOCK_NAMES[s]||s, exchange:'NSE' }); });
    });
    _stockListCache = stocks; _stockListTime = Date.now();
    console.log(`[StockList] Loaded ${stocks.length} stocks`);
    return stocks;
}

app.get('/api/stock-list', async (req, res) => {
    try { res.json({ total: (await getStockList()).length, stocks: await getStockList() }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

/* ═══════════════════════════════════════════════════════════
   API: /api/search — search all NSE stocks with live prices
═══════════════════════════════════════════════════════════ */
app.get('/api/search', async (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    const limit = Math.min(parseInt(req.query.limit||'20'), 50);
    if (!q) return res.json({ results: [] });
    try {
        const list = await getStockList();
        const scored = list.map(s => {
            const base = s.symbol.replace('.NS','').replace('.BO','').toLowerCase(), name = s.name.toLowerCase();
            let sc = 0;
            if (base===q) sc=100; else if (base.startsWith(q)) sc=80; else if (name.startsWith(q)) sc=60;
            else if (base.includes(q)) sc=40; else if (name.includes(q)) sc=20;
            return sc > 0 ? {...s, _sc: sc} : null;
        }).filter(Boolean).sort((a,b)=>b._sc-a._sc).slice(0, limit);
        if (!scored.length) return res.json({ results: [], total: 0 });
        const priceResults = await Promise.allSettled(scored.map(s => fetchOneQuote(s.symbol)));
        const results = scored.map((s,i) => {
            const p = priceResults[i].status==='fulfilled' ? priceResults[i].value : null;
            return { ...s, price:p?.price??null, prevClose:p?.prevClose??null, high52:p?.high52??null, low52:p?.low52??null, changeP:p?.changeP??null };
        });
        res.json({ results, total: results.length });
    } catch (e) {
        res.status(500).json({ error: e.message, results: [] });
    }
});

/* ═══════════════════════════════════════════════════════════
   API: /api/sectors — all NSE stocks grouped by sector
═══════════════════════════════════════════════════════════ */
app.get('/api/sectors', async (req, res) => {
    try {
        const [equityResp, nifty500Resp] = await Promise.all([
            axios.get('https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv', { headers:{'User-Agent':'Mozilla/5.0'}, timeout:12000, responseType:'text' }),
            axios.get('https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv', { headers:{'User-Agent':'Mozilla/5.0'}, timeout:12000, responseType:'text' }),
        ]);
        const allStocks = [];
        equityResp.data.split('\n').slice(1).forEach(line => {
            const cols=line.split(','); const sym=cols[0]?.trim(), name=cols[1]?.trim();
            if (sym && name && cols[2]?.trim()==='EQ') allStocks.push({ symbol: sym+'.NS', name, industry: null });
        });
        const n500map = {};
        nifty500Resp.data.split('\n').slice(1).forEach(line => {
            const cols=line.split(','); const sym=cols[2]?.trim(), ind=cols[1]?.trim();
            if (sym && ind) n500map[sym] = ind;
        });
        allStocks.forEach(s => { const base=s.symbol.replace('.NS',''); if(n500map[base]) s.industry=n500map[base]; });
        allStocks.forEach(s => {
            if (s.industry) return;
            const nl = s.name.toLowerCase();
            for (const [sector, kws] of Object.entries(SECTOR_KEYWORDS)) {
                if (kws.some(kw => nl.includes(kw))) { s.industry=sector; break; }
            }
            if (!s.industry) s.industry='Others';
        });
        const sectorMap = {};
        allStocks.forEach(s => { if(!sectorMap[s.industry])sectorMap[s.industry]=[]; sectorMap[s.industry].push(s.symbol); });
        Object.entries(CUSTOM_SECTORS).forEach(([sname, syms]) => {
            sectorMap[sname] = syms.map(s=>s+'.NS');
            syms.forEach(sym => {
                const base=sym, full=sym+'.NS', dn=CUSTOM_STOCK_NAMES[base]||base;
                if (!allStocks.find(s=>s.symbol===full)) allStocks.push({symbol:full, name:dn, industry:sname});
                else { const ex=allStocks.find(s=>s.symbol===full); if(ex){ex.industry=sname; if(!ex.name||ex.name===base)ex.name=dn;} }
            });
        });
        const customSectorList = Object.entries(CUSTOM_SECTORS).map(([name,syms])=>({name, count:syms.length, symbols:syms.map(s=>s+'.NS'), custom:true}));
        const standardSectors = Object.entries(sectorMap).filter(([n])=>!CUSTOM_SECTORS[n]&&n!=='Others').map(([n,s])=>({name:n,count:s.length,symbols:s})).sort((a,b)=>b.count-a.count);
        const others = sectorMap['Others'] ? [{name:'Others',count:sectorMap['Others'].length,symbols:sectorMap['Others']}] : [];
        res.json({ sectors:[...customSectorList,...standardSectors,...others], stocks:allStocks, total:allStocks.length });
    } catch (e) {
        console.error('[Sectors]', e.message);
        res.status(500).json({ error: e.message });
    }
});

/* ═══════════════════════════════════════════════════════════
   API: /api/screen — technical screener (RSI, EMA, Volume)
═══════════════════════════════════════════════════════════ */
let _screenerSymbolsCache = null, _screenerSymbolsTime = 0;

async function getScreenerSymbols() {
    if (_screenerSymbolsCache && Date.now()-_screenerSymbolsTime < 12*60*60*1000) return _screenerSymbolsCache;
    try {
        const resp = await axios.get('https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv', { headers:{'User-Agent':'Mozilla/5.0'}, timeout:12000, responseType:'text' });
        const syms = [];
        resp.data.split('\n').slice(1).forEach(line => { const cols=line.split(','); const sym=cols[2]?.trim(); if(sym) syms.push(sym+'.NS'); });
        _screenerSymbolsCache = syms; _screenerSymbolsTime = Date.now();
        return syms;
    } catch (e) { return _screenerSymbolsCache || []; }
}

function calcEMA(prices, period) {
    if (prices.length < period) return null;
    const k=2/(period+1); let ema=prices.slice(0,period).reduce((a,b)=>a+b,0)/period;
    for (let i=period;i<prices.length;i++) ema=prices[i]*k+ema*(1-k);
    return ema;
}
function calcRSI(prices, period=14) {
    if (prices.length < period+1) return null;
    let g=0,l=0;
    for (let i=1;i<=period;i++){const d=prices[i]-prices[i-1];if(d>0)g+=d;else l-=d;}
    let ag=g/period,al=l/period;
    for (let i=period+1;i<prices.length;i++){const d=prices[i]-prices[i-1];ag=(ag*(period-1)+(d>0?d:0))/period;al=(al*(period-1)+(d<0?-d:0))/period;}
    if(al===0)return 100;
    return 100-(100/(1+ag/al));
}
function analyzeStock(symbol, name, exchange, candles) {
    if (candles.length < 20) return null;
    const closes=candles.map(c=>c.c), volumes=candles.map(c=>c.v), n=closes.length;
    const last=closes[n-1], high52=Math.max(...candles.map(c=>c.h)), low52=Math.min(...candles.map(c=>c.l));
    const ema20=calcEMA(closes,20), ema50=calcEMA(closes,Math.min(50,closes.length)), rsi14=calcRSI(closes,14);
    const avgVol20=volumes.slice(-20).reduce((a,b)=>a+b,0)/20, volSurge=avgVol20>0?volumes[n-1]/avgVol20:1;
    const mom5=n>=5?((last-closes[n-5])/closes[n-5]*100):0, mom20=n>=20?((last-closes[n-20])/closes[n-20]*100):0;
    let consecUp=0; for(let i=n-1;i>=1&&closes[i]>closes[i-1];i--)consecUp++;
    const fromHigh=(last-high52)/high52*100, fromLow=(last-low52)/low52*100;
    const signals=[]; let score=0;
    if(rsi14!=null){if(rsi14>=55&&rsi14<=70){signals.push({name:'RSI Bullish',tier:'A'});score+=25;}else if(rsi14>=45&&rsi14<55){signals.push({name:'RSI Rising',tier:'B'});score+=15;}else if(rsi14>30&&rsi14<45){signals.push({name:'RSI Recovery',tier:'C'});score+=8;}}
    if(ema20&&ema50){if(last>ema20&&ema20>ema50){signals.push({name:'EMA Uptrend',tier:'A'});score+=25;}else if(last>ema20){signals.push({name:'Above EMA20',tier:'B'});score+=15;}}else if(ema20&&last>ema20){signals.push({name:'Above EMA20',tier:'B'});score+=12;}
    if(mom5>3){signals.push({name:'5D Momentum',tier:'A'});score+=20;}else if(mom5>1){signals.push({name:'5D Momentum',tier:'B'});score+=10;}
    if(mom20>5){signals.push({name:'20D Momentum',tier:'A'});score+=15;}
    if(volSurge>=2){signals.push({name:'Volume Surge',tier:'A'});score+=20;}else if(volSurge>=1.3){signals.push({name:'Volume Up',tier:'B'});score+=10;}
    if(fromHigh>=-3){signals.push({name:'52W High Breakout',tier:'A'});score+=20;}else if(fromHigh>=-8){signals.push({name:'Near 52W High',tier:'B'});score+=10;}
    if(consecUp>=4){signals.push({name:`${consecUp}-Day Rally`,tier:'A'});score+=15;}else if(consecUp>=2){signals.push({name:`${consecUp}-Day Rally`,tier:'B'});score+=8;}
    if(rsi14!=null&&rsi14>=35&&rsi14<45&&mom5>2){signals.push({name:'Oversold Bounce',tier:'B'});score+=15;}
    if(rsi14!=null&&rsi14>75)score-=15;
    score=Math.max(0,Math.min(100,score));
    if(!signals.length)return null;
    return {symbol,name,exchange,score,signals,price:last,rsi:rsi14?Math.round(rsi14):null,ema20:ema20?Math.round(ema20*100)/100:null,ema50:ema50?Math.round(ema50*100)/100:null,mom5:Math.round(mom5*10)/10,mom20:Math.round(mom20*10)/10,volSurge:Math.round(volSurge*10)/10,fromHigh:Math.round(fromHigh*10)/10,fromLow:Math.round(fromLow*10)/10,high52,low52,consecUp};
}

app.get('/api/screen', async (req, res) => {
    const symbols = await getScreenerSymbols();
    const CONCURRENCY = 20;
    const allResults = [];
    for (let i=0;i<symbols.length;i+=CONCURRENCY) {
        const chunk=symbols.slice(i,i+CONCURRENCY);
        const settled=await Promise.allSettled(chunk.map(async sym=>{
            try {
                const url=`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=3mo`;
                const resp=await axios.get(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'},timeout:7000});
                const result=resp.data?.chart?.result?.[0];
                const meta=result?.meta, ts=result?.timestamp||[], q=result?.indicators?.quote?.[0]||{};
                const candles=[]; for(let j=0;j<ts.length;j++){if(q.close?.[j]==null)continue;candles.push({t:ts[j]*1000,o:q.open?.[j]??q.close[j],h:q.high?.[j]??q.close[j],l:q.low?.[j]??q.close[j],c:q.close[j],v:q.volume?.[j]??0});}
                const name=meta?.longName||meta?.shortName||sym.replace('.NS','');
                return analyzeStock(sym,name,'NSE',candles);
            } catch(_){return null;}
        }));
        settled.forEach(r=>{if(r.status==='fulfilled'&&r.value)allResults.push(r.value);});
    }
    const picks=allResults.sort((a,b)=>b.score-a.score);
    res.json({picks,total:picks.length,scanned:symbols.length,timestamp:Date.now()});
});

/* ═══════════════════════════════════════════════════════════
   API: /api/logo/:symbol — stock company logo
═══════════════════════════════════════════════════════════ */
const LOGO_CACHE = new Map();
const STOCK_WEBSITES = {
    'RELIANCE':'ril.com','TCS':'tcs.com','HDFCBANK':'hdfcbank.com','INFY':'infosys.com','ICICIBANK':'icicibank.com',
    'HINDUNILVR':'hul.co.in','ITC':'itcportal.com','SBIN':'sbi.co.in','BHARTIARTL':'airtel.in','KOTAKBANK':'kotak.com',
    'AXISBANK':'axisbank.com','LT':'larsentoubro.com','WIPRO':'wipro.com','HCLTECH':'hcltech.com','ASIANPAINT':'asianpaints.com',
    'MARUTI':'marutisuzuki.com','SUNPHARMA':'sunpharma.com','TITAN':'titancompany.in','ULTRACEMCO':'ultratechcement.com',
    'BAJFINANCE':'bajajfinserv.in','NESTLEIND':'nestle.in','NTPC':'ntpc.co.in','ONGC':'ongcindia.com','ADANIENT':'adani.com',
    'ADANIPORTS':'adaniports.com','CIPLA':'cipla.com','DRREDDY':'drreddys.com','TATAMOTORS':'tatamotors.com','TATASTEEL':'tatasteel.com',
    'TATACONSUM':'tataconsumer.com','BAJAJ-AUTO':'bajajauto.com','INDUSINDBK':'indusind.com','BAJAJFINSV':'bajajfinserv.in',
    'COALINDIA':'coalindia.in','POWERGRID':'powergridindia.com','TECHM':'techmahindra.com','BRITANNIA':'britannia.co.in',
    'HEROMOTOCO':'heromotocorp.com','JSWSTEEL':'jsw.in','HINDALCO':'hindalco.com','SBILIFE':'sbilife.co.in',
    'HDFCLIFE':'hdfclife.com','APOLLOHOSP':'apollohospitals.com','TATAPOWER':'tatapower.com',
    'HAL':'hal-india.co.in','BEL':'bel-india.in','MAZDOCK':'mazdock.com','GRSE':'grse.in','COCHINSHIP':'cochinshipyard.com',
    'BHARATFORG':'bharatforge.com','ZOMATO':'zomato.com','PAYTM':'paytm.com','IRCTC':'irctc.co.in','INDIGO':'goindigo.in',
    'RENUKA':'shreerenukasugars.com','DLF':'dlf.in','GODREJPROP':'godrejproperties.com','AMBUJACEM':'ambujacement.com',
    'COROMANDEL':'coromandel.farm','DEEPAKFERT':'deepakfertilisers.com','CHAMBLFERT':'chambalfertilisers.com',
    'FACT':'fact.co.in','NFL':'nationalfertilizers.com','GNFC':'gnfc.in','KSCL':'kaveriseed.com',
    'INDHOTEL':'tajhotels.com','ITCHOTELS':'itchotels.com','THELEELA':'theleela.com','CHALET':'chalethotels.com',
    'LEMONTREE':'lemontreehotels.com','MHRIL':'clubmahindra.com','WONDERLA':'wonderla.com','GMRAIRPORT':'gmrairports.com',
    'EASEMYTRIP':'easemytrip.com','YATRA':'yatra.com','RATEGAIN':'rategain.com',
};

app.get('/api/logo/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const base   = symbol.replace('.NS','').replace('.BO','');
    if (LOGO_CACHE.has(symbol)) {
        const c=LOGO_CACHE.get(symbol);
        res.setHeader('Content-Type',c.type); res.setHeader('Cache-Control','public,max-age=86400');
        return res.send(c.data);
    }
    try {
        const r=await axios.get(`https://companiesmarketcap.com/img/company-logos/64/${symbol}.webp`,{responseType:'arraybuffer',timeout:6000,maxRedirects:0,validateStatus:s=>s===200});
        LOGO_CACHE.set(symbol,{type:'image/webp',data:r.data});
        res.setHeader('Content-Type','image/webp'); res.setHeader('Cache-Control','public,max-age=86400');
        return res.send(r.data);
    } catch (_) {}
    const domain=STOCK_WEBSITES[base];
    if (domain) {
        try {
            const r=await axios.get(`https://logo.clearbit.com/${domain}?size=64`,{responseType:'arraybuffer',timeout:6000,validateStatus:s=>s===200});
            LOGO_CACHE.set(symbol,{type:'image/png',data:r.data});
            res.setHeader('Content-Type','image/png'); res.setHeader('Cache-Control','public,max-age=86400');
            return res.send(r.data);
        } catch (_) {}
    }
    const initials=base.slice(0,2).toUpperCase();
    const colors=['#1a56db','#0694a2','#057a55','#9f1239','#7e3af2','#c27803','#b91c1c','#1e40af'];
    const color=colors[base.charCodeAt(0)%colors.length];
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="${color}"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="14" font-weight="700" font-family="Arial,sans-serif">${initials}</text></svg>`;
    LOGO_CACHE.set(symbol,{type:'image/svg+xml',data:svg});
    res.setHeader('Content-Type','image/svg+xml'); res.setHeader('Cache-Control','public,max-age=3600');
    res.send(svg);
});

/* ═══════════════════════════════════════════════════════════
   API: /api/gift-nifty — GIFT Nifty latest price via NSE India
═══════════════════════════════════════════════════════════ */
let _giftCache = null, _giftCacheTime = 0;

app.get('/api/gift-nifty', async (req, res) => {
    try {
        // Use cached value if < 60s old
        if (_giftCache && Date.now() - _giftCacheTime < 60000) {
            return res.json(_giftCache);
        }

        const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

        // Step 1: get cookies from NSE homepage
        const home = await axios.get('https://www.nseindia.com/', {
            headers: { 'User-Agent': UA, 'Accept': 'text/html' },
            timeout: 10000,
        });
        const cookies = (home.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

        // Step 2: fetch allIndices which includes GIFT Nifty
        const resp = await axios.get('https://www.nseindia.com/api/allIndices', {
            headers: {
                'User-Agent': UA,
                'Accept': 'application/json',
                'Referer': 'https://www.nseindia.com/',
                'Cookie': cookies,
            },
            timeout: 10000,
        });

        const indices = resp.data?.data || [];
        const gift = indices.find(i => i.index && i.index.toUpperCase().includes('GIFT'));

        if (gift) {
            const result = {
                price:     gift.last,
                prevClose: gift.previousClose,
                change:    gift.variation,
                changeP:   gift.percentChange,
                high:      gift.high,
                low:       gift.low,
                source:    'NSE India',
            };
            _giftCache = result;
            _giftCacheTime = Date.now();
            return res.json(result);
        }

        // Fallback: use Nifty 50 spot as proxy
        const nifty = indices.find(i => i.index === 'NIFTY 50');
        if (nifty) {
            return res.json({
                price:     nifty.last,
                prevClose: nifty.previousClose,
                change:    nifty.variation,
                changeP:   nifty.percentChange,
                high:      nifty.high,
                low:       nifty.low,
                source:    'Nifty 50 (proxy)',
                isProxy:   true,
            });
        }

        res.status(404).json({ error: 'GIFT Nifty data not available' });
    } catch (e) {
        console.error('[GIFT Nifty]', e.message);
        res.status(500).json({ error: e.message });
    }
});

/* ═══════════════════════════════════════════════════════════
   START SERVER
═══════════════════════════════════════════════════════════ */
http.createServer({ maxHeaderSize: 32768 }, app).listen(PORT, '0.0.0.0', () => {
    console.log(`\n🇮🇳  Indian Stock Dashboard — by Subrat`);
    console.log(`📈  Running at http://localhost:${PORT}\n`);
});
