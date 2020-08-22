

export class SortableStack<T> {
    private stack: T[] = []
    private sorted = false
  
    push(task: T): void {
        this.sorted = false
        this.stack.push(task) 
    }

    pop(): T | null {
        let item: T | null = null
        
        if (this.stack.length > 0){
            item = this.stack[0]
            this.stack.splice(0, 1)
        }

        return item
    }

    peek(): T | null {
        let item: T | null = null

        if (this.stack.length > 0){
            item = this.stack[0]
        }

        return item
    }

    size(): number {
        return this.stack.length
    }

    clear(): void {
        this.stack.splice(0, this.stack.length)
    }

    isSorted(): boolean {
        return this.sorted
    }

    sort(check: (arg1: T, arg2: T) => number): void {
        this.stack.sort(check)
        this.sorted = true
    }

}