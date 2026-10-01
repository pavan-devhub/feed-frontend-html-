// Why Exports view of the exports page: the four premium cards slide in (animate-in) the first time
// at least 15% of the card row is on screen.
export function mountWhyExports(view) {
  const cards = view.querySelector('.we-premium-cards');

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      cards.classList.add('animate-in');
      observer.disconnect();
    }
  }, { threshold: 0.15 });

  if (cards) observer.observe(cards);

  return () => observer.disconnect();
}
