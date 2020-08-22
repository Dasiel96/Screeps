import { CreepTask } from "./creepTasks"
import { CreepData } from "./interfaces"
import { CommonFunctions } from "./commonFuncs"

/**
* Object that keeps track of when the creep is first created, when it's still alive, and when it dies
* and calls the appropretate code for each state
* 
* @param   {Creep}      creep  used to store data needed for the onDestroy call
* @param   {CreepTask}  task   used to run the creep's task
* @author Daniel Schechtman
*/
export class CreepStateWatcher {

    private readonly creep_id: string
    private readonly origin_room: string
    private readonly creep_name: string
    private readonly owner: string
    private readonly task: CreepTask
    private readonly role: string
    private cur_room = ""

    get curRoom(): string {
        return this.cur_room
    }

    /**
     * Object to check if the creep still exists in the game world
     * and runs the creep task if it still does. otherwise it will call onDestroy
     *
     * @param   {Creep}      creep  used to store data needed for the onDestroy call
     * @param   {CreepTask}  task   used to run the creep's task
     * @author Daniel Schechtman
     */
    constructor(creep: Creep, task: CreepTask) {
        this.creep_id = creep.id
        this.task = task
        this.origin_room = creep.room.name
        this.cur_room = this.origin_room
        this.creep_name = creep.name
        this.owner = creep.owner.username
        this.role = creep.memory.role
        task.onStart(creep)
    }


    /**
     * a wrapper that will check if a creep exists and call the correct CreepTask.onRun() if it exists
     * otherwise it will call the correct CreepTask.onDestroy()
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    onRun(): boolean {
        const creep = Game.getObjectById<Creep>(this.creep_id)

        if (creep) {
            if (!creep.spawning) {
                this.cur_room = creep.room.name
                this.task.onRun(creep)
            }
        }
        else {
            const data: CreepData = {
                origin_room: this.origin_room,
                id: this.creep_id,
                owner: this.owner,
                cur_room: this.cur_room,
                name: this.creep_name,
                role: this.role,
            }
            CommonFunctions.filterPrint(data.origin_room, 1, `destroying ${data.name}`)

            this.task.onDestroy(data)
        }

        return Boolean(creep)
    }
}