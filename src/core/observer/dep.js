/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher
  id: number
  subs: Array<Watcher>

  constructor() {
    this.id = uid++
    this.subs = []
  }
  //  添加订阅
  addSub(sub: Watcher) {
    this.subs.push(sub)
  }

  // 删除订阅
  removeSub(sub: Watcher) {
    remove(this.subs, sub)
  }

  depend() {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 通知
  notify() {
    // stabilize the subscriber list first
    // 浅拷贝订阅列表
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order

      // 关闭异步，则subs不在调度中排序
      // 为了保证他们能正确的执行，现在就带他们进行排序
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.

// 这个是全局独一无二的属性
// 以为同一时间只能运行一个
Dep.target = null
const targetStack = []

export function pushTarget(target: ?Watcher) {
  // debugger
  targetStack.push(target)
  Dep.target = target
}

export function popTarget() {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
