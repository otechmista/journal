import * as cheerio from 'cheerio';

async function analyze(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'JournalCrawler/0.1' } });
	const html = await res.text();
	const $ = cheerio.load(html);
	console.log('\n====', url);
	console.log('tec--card', $('.tec--card').length);
	console.log('tec--card__title__link', $('.tec--card__title__link').length);
	console.log('article.tec--card', $('article.tec--card').length);
	if ($('.tec--card').length) {
		const c = $('.tec--card').first();
		console.log('sample', c.html()?.slice(0, 500));
	}
	console.log('h2.entry-title a', $('h2.entry-title a').length);
	console.log('.entry-title a', $('.entry-title a').length);
	console.log('article.post', $('article.post').length);
	console.log('.td-module-title a', $('.td-module-title a').length);
	console.log('.jeg_post_title a', $('.jeg_post_title a').length);
	console.log('h3 a', $('h3 a').length);
	console.log('h2 a', $('h2 a').length);

	const posts = [];
	$('a[href]').each((_, a) => {
		const href = $(a).attr('href') || '';
		const t = $(a).text().replace(/\s+/g, ' ').trim();
		if (
			/convergenciadigital\.com\.br\/(inovacao|mercado|seguranca|governo|carreira)\//.test(href) &&
			t.length > 25
		) {
			const p = $(a).parent();
			const g = p.parent();
			posts.push({
				href: href.slice(0, 90),
				t: t.slice(0, 50),
				parent: `${p.prop('tagName')}.${p.attr('class') || ''}`,
				grand: `${g.prop('tagName')}.${g.attr('class') || ''}`
			});
		}
	});
	console.log('category posts sample', posts.slice(0, 8));
}

await analyze('https://www.tecmundo.com.br/');
await analyze('https://convergenciadigital.com.br/');
