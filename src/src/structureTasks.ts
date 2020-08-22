import { RoomManager } from "./roomManager"

export abstract class StructTasks{
    private room_run_tracker = new Map<string, boolean>()

    protected manager = RoomManager.getInstance()

    protected abstract runLogic(room: Room): void

    run(room: Room){
        try{
            if(!this.room_run_tracker.has(room.name) || this.room_run_tracker.get(room.name)){
                this.room_run_tracker.set(room.name, false)
                this.runLogic(room)
            }
        }
        catch(e){
            const err = e as Error
            console.log(err.stack)
            console.log(`Error: ${err}`)
        }
    }

    reset(){
        for(const key of this.room_run_tracker.keys()){
            this.room_run_tracker.set(key, true)
        }
    }
}