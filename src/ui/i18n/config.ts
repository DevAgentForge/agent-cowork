import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// 导入语言资源
import en from "./locales/en";
import zh from "./locales/zh";

const resources = {
	en: { translation: en },
	zh: { translation: zh },
};

i18n
	// 检测用户语言
	.use(LanguageDetector)
	// 将 i18next 传递给 react-i18next
	.use(initReactI18next)
	// 初始化 i18next
	.init({
		resources,
		fallbackLng: "en",
		debug: false,

		interpolation: {
			escapeValue: false, // React 已经做了 XSS 防护
		},

		detection: {
			// 存储语言首选项的位置
			order: ["localStorage", "navigator"],
			caches: ["localStorage"],
		},
	});

export default i18n;
