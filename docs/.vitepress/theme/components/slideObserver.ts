let slideObserver: MutationObserver | null = null

const config = { childList: true, subtree: true }

export const run = () => {
  if (!slideObserver) {
    slideObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          const parent = node.parentNode as Element
          if (
            node.nodeType === 1 &&
            Object.values(parent?.classList)?.includes('vp-doc')
          ) {
            ;(node as Element).classList.add('slide-enter-content')
          }
        })
      })
    })
    slideObserver.observe(document.body, config)
  }
}

export const stop = () => {
  if (slideObserver) {
    slideObserver.disconnect()
    slideObserver = null
  }
}

export default { run, stop }
