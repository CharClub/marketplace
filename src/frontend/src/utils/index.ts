export const getNftIdFromSlug = (slug: string) => {
  return slug.split("-").pop() ?? "";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const unsafeCast = <T>(value: any): T => {
  return value as T;
};

export const delay = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getCharacterUrl = (id?: string) => {
  const host = import.meta.env.VITE_CHARCLUB_AI_URL;

  if (!id) {
    return "#";
  }

  return `${host}/${id}`;
};

export const titleCase = (str: string) =>
  str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
  );
