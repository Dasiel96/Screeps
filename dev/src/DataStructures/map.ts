
export class TwoDemMap<A, B> {
    private readonly multiMap = new Map<string, Map<A, B>>()

    add(key1: string, key2: A, val: B): void {
        if (!this.multiMap.has(key1)){
            this.multiMap.set(key1, new Map())
        }

        if (!this.multiMap.get(key1)!!.has(key2)){
            this.multiMap.get(key1)!!.set(key2, val)
        }
    }

    get(key1: string, key2: A): B | null {
        let ret_val: B | null = null
        if (this.multiMap.has(key1)) {
            if (this.multiMap.get(key1)!!.has(key2)) {
                ret_val = this.multiMap.get(key1)!!.get(key2)!!
            }
        }
        return ret_val
    }

    delete(key1: string, key2: A): void {
        this.multiMap.get(key1)?.delete(key2)
    }

    has(key1: string, key2: A): boolean {
        let has_entry = this.multiMap.has(key1)
        if (has_entry) {
            has_entry = this.multiMap.get(key1)!!.has(key2)
        }
        return has_entry
    }

    set(key1: string, key2: A, val: B): void {
        if (this.multiMap.has(key1)) {
            this.multiMap.get(key1)!!.set(key2, val)
        }
        else {
            this.add(key1, key2, val)
        }
    }

    size(key1: string): number {
        let size = 0
        if (this.multiMap.has(key1)) {
            size = this.multiMap.get(key1)!!.size
        }
        return size
    }

    forEach(key1: string, callback: (val: B, key: A) => void, ...args: any[]): void{
        const room_map = this.multiMap.get(key1)
        if (room_map){
            room_map.forEach(callback, args)
        }
    }

    clearRow(key1: string): void{
        this.multiMap.get(key1)?.clear()
    }

    clear(): void {
        this.multiMap.clear()
    }
}