
export class UnsignedNumber{
    private num: number

    constructor(init_val: number){
        if(init_val < 0){
            init_val = 0
        }
        this.num = init_val
    }

    private getNum(val: number | UnsignedNumber){
        let ret_val: number

        if(val instanceof UnsignedNumber){
            ret_val = val.get()
        }
        else{
            ret_val = val
        }

        return ret_val
    }

    add(val: number | UnsignedNumber){
        let compute_val = this.getNum(val)

        const overflow_dif = Number.MAX_SAFE_INTEGER - this.num

        if(compute_val > overflow_dif){
            const remaining_after_overflow = compute_val - 1 - overflow_dif
            this.num = remaining_after_overflow
        }
        else{
            this.num += compute_val
        }
    }

    subtract(val: number | UnsignedNumber){
        let compute_val = this.getNum(val)

        if(this.num - compute_val < 0){
            const overflow_dif = this.num + 1 - compute_val
            this.num = Number.MAX_VALUE + overflow_dif
        }
        else{
            this.num -= compute_val
        }
    }

    get(){
        return this.num
    }

    set(val: number){
        if(val < 0){
            val = 0
        }
        this.num = val
    }
}