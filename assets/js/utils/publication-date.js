// PublicationSummaryDto/PublicationDetailDto send publishedDate down as ISO "yyyy-MM-dd" -
// this reorders it into "dd-mm-yyyy" for display, without going through Date parsing (and its
// timezone pitfalls) since the ISO string is already zero-padded.
export function formatPublishedDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}-${month}-${year}`;
}
