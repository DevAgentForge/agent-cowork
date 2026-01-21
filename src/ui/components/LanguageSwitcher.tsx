import { useTranslation } from "react-i18next";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function LanguageSwitcher() {
	const { t, i18n } = useTranslation();

	const languages = [
		{ code: "en", name: t("language.en") },
		{ code: "zh", name: t("language.zh") },
	];

	const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button
					className="flex items-center gap-2 rounded-xl border border-ink-900/10 bg-surface px-3 py-2 text-sm text-ink-700 hover:bg-surface-tertiary hover:border-ink-900/20 transition-colors"
					aria-label="Change language"
				>
					<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
						<circle cx="12" cy="12" r="10" />
						<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
					</svg>
					<span className="font-medium">{currentLanguage.name}</span>
					<svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M6 9l6 6 6-6" />
					</svg>
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					className="z-50 min-w-[140px] rounded-xl border border-ink-900/10 bg-white p-1 shadow-lg"
					align="center"
					sideOffset={8}
				>
					{languages.map((lang) => (
						<DropdownMenu.Item
							key={lang.code}
							className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-ink-900/5 ${
								i18n.language === lang.code ? "bg-accent/10 text-accent font-medium" : "text-ink-700"
							}`}
							onClick={() => i18n.changeLanguage(lang.code)}
						>
							{lang.name}
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
