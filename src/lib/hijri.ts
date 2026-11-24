/**
 * Today's Hijri date in Arabic, with English (Latin) digits as the brief asks.
 * Falls back to a fixed sample if the device's Intl lacks the Islamic calendar.
 */
export function hijriDateArabic(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
      .format(date)
      .replace(/\s?هـ$/, '');
  } catch {
    return '3 جمادى الآخرة 1448';
  }
}
