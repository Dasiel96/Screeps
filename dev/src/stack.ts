

export class FIFOStack<T> {
    private stack = new Array<T>()
    private sorted = false
  
    push(task: T){
        this.sorted = false
        this.stack.push(task) 
    }

    pop(){
        let item: T | null = null
        
        if (this.stack.length > 0){
            item = this.stack[0]
            this.stack.splice(0, 1)
        }

        return item
    }

    peek() {
        let item: T | null = null

        if (this.stack.length > 0){
            item = this.stack[0]
        }

        return item
    }

    size(){
        return this.stack.length
    }

    clear() {
        this.stack.splice(0, this.stack.length)
    }

    isSorted() {
        return this.sorted
    }

    sort(check: (arg1: T, arg2: T) => number){
        this.stack.sort(check)
        this.sorted = true
    }

}