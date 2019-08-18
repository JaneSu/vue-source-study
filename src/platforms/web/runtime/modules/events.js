/* @flow */

import { isDef, isUndef } from 'shared/util'
import { updateListeners } from 'core/vdom/helpers/index'
import { isIE, isFF, supportsPassive, isUsingMicroTask } from 'core/util/index'
import { RANGE_TOKEN, CHECKBOX_RADIO_TOKEN } from 'web/compiler/directives/model'
import { currentFlushTimestamp } from 'core/observer/scheduler'

// normalize v-model event tokens that can only be determined at runtime.
// it's important to place the event as the first in the array because
// the whole point is ensuring the v-model callback gets called before
// user-attached handlers.
function normalizeEvents(on) {
  /* istanbul ignore if */
  if (isDef(on[RANGE_TOKEN])) {
    // IE input[type=range] only supports `change` event
    const event = isIE ? 'change' : 'input'
    on[event] = [].concat(on[RANGE_TOKEN], on[event] || [])
    delete on[RANGE_TOKEN]
  }
  // This was originally intended to fix #4521 but no longer necessary
  // after 2.5. Keeping it for backwards compat with generated code from < 2.4
  /* istanbul ignore if */
  if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
    on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || [])
    delete on[CHECKBOX_RADIO_TOKEN]
  }
}

let target: any

function createOnceHandler(event, handler, capture) {
  const _target = target // save current target element in closure
  return function onceHandler() {
    const res = handler.apply(null, arguments)
    if (res !== null) {
      remove(event, onceHandler, capture, _target)
    }
  }
}

// #9446: Firefox <= 53 (in particular, ESR 52) has incorrect Event.timeStamp
// implementation and does not fire microtasks in between event propagation, so
// safe to exclude.

// 火狐在53版本下，事件触发的时间戳记录不正确
// 并且在事件传播的过程中也不触发微任务
// 因此可以安全的排除
const useMicrotaskFix = isUsingMicroTask && !(isFF && Number(isFF[1]) <= 53)

function add(name: string, handler: Function, capture: boolean, passive: boolean) {
  // async edge case #6566: inner click event triggers patch, event handler
  // attached to outer element during patch, and triggered again. This
  // happens because browsers fire microtask ticks between event propagation.
  // the solution is simple: we save the timestamp when a handler is attached,
  // and the handler would only fire if the event passed to it was fired
  // AFTER it was attached.

  // 内置的点击事件触发补丁，打补丁时处理函数属于输出的html标签，并且再次触发
  // 这是由于浏览器在事件传播的过程触发微任务
  if (useMicrotaskFix) {
    const attachedTimestamp = currentFlushTimestamp
    const original = handler

    handler = original._wrapper = function(e) {
      if (
        // no bubbling, should always fire.
        // this is just a safety net in case event.timeStamp is unreliable in
        // certain weird environments...

        // 不会冒泡，总是能被触发
        // 这是一种安全措施，避免在某些奇怪的情况下，事件触发的时间戳不可靠

        e.target === e.currentTarget ||
        // event is fired after handler attachment
        // 事件应该在方法挂载之后执行
        e.timeStamp >= attachedTimestamp ||
        // bail for environments that have buggy event.timeStamp implementations
        // #9462 iOS 9 bug: event.timeStamp is 0 after history.pushState
        // #9681 QtWebEngine event.timeStamp is negative value

        // 确保在一些奇怪的情况下，时间时间戳能正常记录
        e.timeStamp <= 0 ||
        // #9448 bail if event is fired in another document in a multi-page
        // electron/nw.js app, since event.timeStamp will be using a different
        // starting reference

        // 如果事件在多页面程序中的其他页面被处罚，确保他能正确执行
        // 因为事件触发的时间需要一个不同的初始参考值
        e.target.ownerDocument !== document
      ) {
        debugger
        console.log(original.apply(this, arguments))
        return original.apply(this, arguments)
      }
    }
  }
  debugger
  // 初始化
  // 绑定 change 事件
  target.addEventListener(name, handler, supportsPassive ? { capture, passive } : capture)
}

function remove(name: string, handler: Function, capture: boolean, _target?: HTMLElement) {
  ;(_target || target).removeEventListener(name, handler._wrapper || handler, capture)
}

function updateDOMListeners(oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
  target = vnode.elm
  normalizeEvents(on)
  updateListeners(on, oldOn, add, remove, createOnceHandler, vnode.context)
  target = undefined
}

export default {
  create: updateDOMListeners,
  update: updateDOMListeners
}
