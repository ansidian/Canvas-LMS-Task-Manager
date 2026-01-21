export const getNextLink = (linkHeader) => {
  if (!linkHeader) return null;
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const [urlPart, relPart] = part.split(";").map((item) => item.trim());
    if (!urlPart || !relPart) continue;
    if (relPart === 'rel="next"') {
      return urlPart.replace(/^<|>$/g, "");
    }
  }
  return null;
};
