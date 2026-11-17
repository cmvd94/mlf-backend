import i18n from "i18n";
import path from "path";
import { Language } from "@/shared/constants/locale";

i18n.configure({
  locales: [Language.en, Language.ta],
  directory: path.join(__dirname, "../../locales"),
  defaultLocale: Language.en,
  cookie: "lang",
  autoReload: true,
  updateFiles: false,
  objectNotation: true,
});

export default i18n;
