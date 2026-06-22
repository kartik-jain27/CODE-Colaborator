export const LANGUAGES = [
  { id: 'html', label: 'HTML/CSS/JS' },
  { id: 'javascript', label: 'JavaScript' },
]

export const HTML_DOCUMENT_TABS = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'javascript', label: 'JavaScript' },
]

export const SINGLE_DOCUMENT_ID = 'codemirror'

export const getLanguageLabel = (languageId) =>
  LANGUAGES.find((language) => language.id === languageId)?.label || 'HTML/CSS/JS'

export const getDocumentNamesForLanguage = (languageId) =>
  languageId === 'html' ? HTML_DOCUMENT_TABS.map((tab) => tab.id) : [SINGLE_DOCUMENT_ID]

export const getDefaultActiveDocument = (languageId) =>
  languageId === 'html' ? HTML_DOCUMENT_TABS[0].id : SINGLE_DOCUMENT_ID

export const USER_NAME_STORAGE_KEY = 'code-colaborator-user-name'
