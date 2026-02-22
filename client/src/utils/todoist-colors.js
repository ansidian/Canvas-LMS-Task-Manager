// Todoist API color names → hex values
// https://developer.todoist.com/guides/#colors
const TODOIST_COLORS = {
  berry_red: "#B8255F",
  red: "#DC4C3E",
  orange: "#C77100",
  yellow: "#B29104",
  olive_green: "#949C31",
  lime_green: "#65A33A",
  green: "#369307",
  mint_green: "#42A393",
  teal: "#148FAD",
  sky_blue: "#319DC0",
  light_blue: "#6988A4",
  blue: "#4180FF",
  grape: "#692EC2",
  violet: "#CA3FEE",
  lavender: "#A4698C",
  magenta: "#E05095",
  salmon: "#C9766F",
  charcoal: "#808080",
  grey: "#999999",
  taupe: "#8F7A69",
};

/** Resolve a Todoist color name to a hex value. Falls back to the raw value if already hex. */
export function todoistColor(name) {
  if (!name) return null;
  return TODOIST_COLORS[name] || (name.startsWith("#") ? name : null);
}
