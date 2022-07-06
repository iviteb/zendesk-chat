/* eslint-disable vtex/prefer-early-return */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-restricted-globals */
import { canUseDOM } from 'vtex.render-runtime'

import type { PixelMessage } from './typings/events'

let fakeBtn: HTMLButtonElement

function updateWidgetSettings(o: Record<string, unknown>) {
  window.zE('webWidget', 'updateSettings', o)
}

function setWidgetLocale(locale: string) {
  window.zE('webWidget', 'setLocale', locale)
}

function waitChatToLoad(fn: Function) {
  window.zE(() => window.$zopim(fn))
}

function onWidgetClosed(fn: Function) {
  window.zE('webWidget:on', 'close', fn)
}

function openWidget() {
  window.zE.activate()
}

function shouldOpenChat() {
  const zdStore = JSON.parse(localStorage.getItem('ZD-store') || 'null')

  if (zdStore) {
    return zdStore.widgetShown
  }

  return localStorage.getItem('zdChatOpen') === 'true'
}

function identifySession() {
  const sessionPromise = window?.__RENDER_8_SESSION__?.sessionPromise

  if (!sessionPromise) return

  sessionPromise.then((session) => {
    const userEmail: string =
      session?.response?.namespaces?.profile?.email?.value || ''

    const firstName: string =
      session?.response?.namespaces?.profile?.firstName?.value || ''

    const lastName: string =
      session?.response?.namespaces?.profile?.lastName?.value || ''

    const userName = `${firstName} ${lastName}`.trim()

    if (userEmail || userName) {
      window.zE.identify({
        name: userName,
        email: userEmail,
      })
    }
  })
}

function bootstrap() {
  const {
    widget: widgetSettings,
    titlePathPreffix = '',
    useAnalytics = false,
    accountKey = null,
  } = window.__zendeskPixel

  const chatTheme = widgetSettings.theme?.theme || widgetSettings.color?.theme
  const btnLabel = widgetSettings.theme?.launcherLabel || 'Chat'
  const btnBgColor = widgetSettings.theme?.launcherColor || chatTheme
  const btnTextColor = widgetSettings.theme?.launcherTextColor
  const btnPosition = widgetSettings.theme?.launcherPosition || 'right'
  const widgetZindex = widgetSettings.theme?.widgetZindex || '999998'

  function configureSnippetForVTEX() {
    window.zESettings = window.zESettings || {}
    window.zESettings.analytics = useAnalytics

    waitChatToLoad(() => {
      const curLocale = document.documentElement.lang

      setWidgetLocale(curLocale)

      const titlePath = `${titlePathPreffix}${document.title}`

      window.$zopim.livechat.sendVisitorPath({
        url: document.URL,
        title: titlePath,
      })

      onWidgetClosed(() => localStorage.setItem('zdChatOpen', 'false'))

      identifySession()
    })

    const helpCenterSuppress = widgetSettings.helpCenter.suppress
    const { departments } = widgetSettings.chat
    const enabled =
      departments.enabled?.map((value) => {
        const intValue = parseInt(value, 10)

        return !isNaN(intValue) ? intValue : value
      }) || []

    const select = isNaN(parseInt(departments.select, 10))
      ? departments.select
      : parseInt(departments.select, 10)

    const { tags } = departments

    updateWidgetSettings({
      webWidget: {
        color: {
          theme: chatTheme,
          launcher: btnBgColor,
          launcherText: btnTextColor,
        },
        position: { horizontal: btnPosition, vertical: 'bottom' },
        zIndex: widgetZindex,
        launcher: {
          label: { '*': btnLabel },
          chatLabel: { '*': btnLabel },
        },
        helpCenter: {
          suppress: helpCenterSuppress,
        },
        chat: {
          departments: {
            enabled,
            select,
            tags,
          },
        },
      },
    })
  }

  function addZDSnippet() {
    const script = document.createElement('script')

    if (fakeBtn) fakeBtn.disabled = true

    script.id = 'ze-snippet'
    script.async = true
    script.src = `https://static.zdassets.com/ekr/snippet.js?key=${accountKey}`
    script.onload = () => {
      const intervalId = setInterval(() => {
        if (window?.zE?.activate == null) {
          return
        }

        clearInterval(intervalId)

        configureSnippetForVTEX()

        openWidget()

        if (fakeBtn) {
          document.body.removeChild(fakeBtn)
        }
      }, 400)
    }

    document.head.appendChild(script)
  }

  if (shouldOpenChat()) {
    addZDSnippet()
  } else {
    // replace fake button with the on click action only
    localStorage.setItem('zdChatOpen', 'true')
    addZDSnippet()
  }
}

export function handleEvents(e: PixelMessage) {
  if (e.data.eventName === 'vtex:pageView') {
    const iframe1 = document.querySelector<HTMLElement>(
      "iframe[title='Button to launch messaging window']"
    )

    const iframe2 = document.querySelector<HTMLElement>(
      "iframe[title='Number of unread messages']"
    )

    const iframe3 = document.querySelector<HTMLElement>(
      "iframe[title='Message from company']"
    )

    if (e.data?.pageTitle === 'Contact') {
      bootstrap()

      if (iframe1) {
        iframe1.style.display = 'block'
      }

      if (iframe2) {
        iframe2.style.display = 'block'
      }

      if (iframe3) {
        iframe3.style.display = 'block'
      }
    } else {
      if (iframe1) {
        iframe1.style.display = 'none'
      }

      if (iframe2) {
        iframe2.style.display = 'none'
      }

      if (iframe3) {
        iframe3.style.display = 'none'
      }
    }
  }
}

if (canUseDOM && window.__zendeskPixel) {
  window.addEventListener('message', handleEvents)
}
