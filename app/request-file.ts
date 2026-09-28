export const MAX_REQUEST_FILE_SIZE = 15 * 1024 * 1024;

export const REQUEST_FILE_EXTENSIONS = [
  ".stl",
  ".step",
  ".stp",
  ".obj",
  ".3mf",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

export function validateRequestFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  if (!REQUEST_FILE_EXTENSIONS.includes(extension as (typeof REQUEST_FILE_EXTENSIONS)[number])) {
    return "Разрешены STL, STEP, STP, OBJ, 3MF, PDF, PNG, JPG и WEBP.";
  }

  if (file.size > MAX_REQUEST_FILE_SIZE) {
    return "Файл больше 15 МБ. Уменьшите его или отправьте менеджеру ссылку отдельно.";
  }

  return "";
}
