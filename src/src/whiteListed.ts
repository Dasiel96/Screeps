export class WhiteList{
    private static white_list = new Map<string, undefined>()

    static add(key: string){
        this.white_list.set(key, undefined)
    }

    static has(key: string){
        return this.white_list.has(key)
    }
}