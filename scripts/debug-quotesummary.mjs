const ticker = 'NXPI';
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const loginRes = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': ua }, redirect: 'follow' });
const cookies = loginRes.headers.get('set-cookie') || '';
await new Promise(r => setTimeout(r, 300));
const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
  headers: { 'User-Agent': ua, 'Cookie': cookies },
});
const crumb = await crumbRes.text();
console.log('Crumb:', crumb);

await new Promise(r => setTimeout(r, 300));
const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?crumb=${encodeURIComponent(crumb)}&modules=financialData%2CdefaultKeyStatistics%2CsummaryDetail`;
const qsRes = await fetch(url, { headers: { 'User-Agent': ua, 'Cookie': cookies } });
const qsData = await qsRes.json();
const fd = qsData?.quoteSummary?.result?.[0]?.financialData;
const ks = qsData?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
const sd = qsData?.quoteSummary?.result?.[0]?.summaryDetail;

console.log('\nfinancialData keys:', fd ? Object.keys(fd).join(', ') : 'null');
console.log('defaultKeyStatistics keys:', ks ? Object.keys(ks).join(', ') : 'null');
console.log('summaryDetail keys:', sd ? Object.keys(sd).join(', ') : 'null');
console.log('\ntrailingPE (summaryDetail):', sd?.trailingPE);
console.log('forwardPE (summaryDetail):', sd?.forwardPE);
console.log('trailingPE (ks):', ks?.trailingPE);
console.log('forwardPE (ks):', ks?.forwardPE);
console.log('totalRevenue (fd):', fd?.totalRevenue);
