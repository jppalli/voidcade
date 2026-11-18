import categories from "./categories.json";
import pictureLabels from "./pictureLabels.json";
const categoryById = Object.fromEntries(
  categories.map((category) => [category.id, category]),
);
export { categories, pictureLabels, categoryById };
