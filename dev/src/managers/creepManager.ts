import { CreepTask } from "../creep-logic/creepTasks";
import { Harvester } from "../creep-logic/harvester";
import { TowerSupplier } from "../creep-logic/towerSupplier";
import { Defender } from "../creep-logic/defender";
import { Claimer } from "../creep-logic/claimer";
import { Builder } from "../creep-logic/builder";
import { DecayRepair } from "../creep-logic/decayRepair";
import { PerminentStructRepair } from "../creep-logic/perminentRepair";
import { Upgrader } from "../creep-logic/upgrader";
import { CommonFunctions } from "../commonFuncs";
import { RoomManager } from "./roomManager";
import { SortableStack } from "../DataStructures/stack";
import { task_names } from "../enums";
import { CreepStateWatcher } from "../creep-logic/creepWatch";
import { TwoDemMap } from "../DataStructures/map";
import { UnsignedNumber } from "../unsignedNum";
import { EnergyDistributor } from "../creep-logic/energyDistributer";
import { stat } from "fs";

/**
 * used to sort tasks by how important they are to the
 * colony's function
 */
interface TaskStackItem {
    task: CreepTask,
    id: number | undefined
    rank: UnsignedNumber
}

/**
 * used to keep tracks of how many creeps should be added to a queue to be spawned
 * in each room
 */
class TaskOnStackCounter {
    private readonly counter = new TwoDemMap<string, number>()

    add(room_name: string, task_role: string, val: number) {
        this.counter.add(room_name, task_role, val)
    }

    get(room_name: string, task_role: string) {
        return this.counter.get(room_name, task_role)
    }

    set(room_name: string, task_role: string, val: number) {
        this.counter.set(room_name, task_role, val)
    }

    delete(room_name: string, task_role: string) {
        this.counter.delete(room_name, task_role)
    }

    clear(room_name: string) {
        this.counter.clearRow(room_name)
    }

    addToTaskValue(room_name: string, task_role: string, add_val: number) {
        const counter_val = this.counter.get(room_name, task_role)

        // note: checks if counter_val is null explicitly because
        // counter_val will evaluate false if counter_val is 0 or null
        // but I want the if-statement to run when counter_val is any number
        if (counter_val !== null && counter_val + add_val >= 0) {
            this.counter.set(room_name, task_role, counter_val + add_val)
        }
    }
}

/**
* This object handles all the processes of running and creating all creeps
* @author Daniel Schechtman
*/
export class CreepManager {

    private static manager: CreepManager | null = null
    private readonly creep_behaviors = new Array<TaskStackItem>()
    private readonly room_queues = new Map<string, SortableStack<TaskStackItem>>()
    private readonly creeps = new TwoDemMap<string, CreepStateWatcher>()
    private readonly requests = new TwoDemMap<string, number>()


    /**
     * This object handles all the processes of running and creating all creeps
     * @author Daniel Schechtman
     */
    private constructor() {

        this.creep_behaviors.push({
            task: new Harvester(),
            id: undefined,
            rank: new UnsignedNumber(1),
        })

        this.creep_behaviors.push({
            task: new EnergyDistributor(),
            id: undefined,
            rank: new UnsignedNumber(0),
        })

        this.creep_behaviors.push({
            task: new Defender(),
            id: undefined,
            rank: new UnsignedNumber(2),
        })

        this.creep_behaviors.push({
            task: new TowerSupplier(),
            id: undefined,
            rank: new UnsignedNumber(3),
        })

        this.creep_behaviors.push({
            task: new Claimer(),
            id: undefined,
            rank: new UnsignedNumber(3),
        })

        this.creep_behaviors.push({
            task: new Builder(),
            id: undefined,
            rank: new UnsignedNumber(4),
        })

        this.creep_behaviors.push({
            task: new DecayRepair(),
            id: undefined,
            rank: new UnsignedNumber(4),
        })

        this.creep_behaviors.push({
            task: new PerminentStructRepair(),
            id: undefined,
            rank: new UnsignedNumber(4),
        })

        this.creep_behaviors.push({
            task: new Upgrader(),
            id: undefined,
            rank: new UnsignedNumber(4),
        })
    }

    public static getInstance(): CreepManager {
        if (this.manager === null) {
            this.manager = new CreepManager()
        }

        return this.manager
    }


    /**
     * outputs all the tasks held in a queue
     *
     * @param   {SortableStack<TaskStackItem>}  queue          the queue to output
     * @param   {string}                        room_name      name of the room a creep or spawn is in
     * @param   {number}                        room_num       number of the room to filter output
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    private printQueue(queue: SortableStack<TaskStackItem>, room_name: string, room_num: number): void {
        const save_queue = new SortableStack<TaskStackItem>()
        const room_number = room_num

        CommonFunctions.filterPrint(room_name, room_number, "Start print")


        while (queue.peek() !== null) {
            CommonFunctions.filterPrint(room_name, room_number, queue.peek()?.task.getRole())
            save_queue.push(queue.pop()!!)
        }

        while (save_queue.peek() !== null) {
            queue.push(save_queue.pop()!!)
        }

        CommonFunctions.filterPrint(room_name, room_number, "End print")

    }

    /**
     * adds tasks to the queue and spawns the current item accessable on the queue 
     * when possible
     *
     * @param   {StructureSpawn}  spawn  used for the room name to get access to the correct queue
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    private create(spawn: StructureSpawn): void {
        if (!this.room_queues.has(spawn.room.name)) {
            this.room_queues.set(spawn.room.name, new SortableStack())
        }

        const queue = this.room_queues.get(spawn.room.name)!!

        // every tick makes sure creeps needed for certain tasks are put on the queue if
        // they don't already exist
        for (const creep of this.creep_behaviors) {
            if (creep.task.shouldSpawn()) {
                const room_name = spawn.room.name
                const role = creep.task.getRole()

                this.requests.add(room_name, role, 0)


                const cap = creep.task.creepCap - creep.task.existingCreeps
                const requests_on_stack = this.requests.get(room_name, role)

                if (requests_on_stack !== null && requests_on_stack < cap) {
                    this.requests.set(room_name, role, requests_on_stack + 1)
                    const creep_id = this.requests.get(room_name, role)!!
                    queue.push({ task: creep.task, id: creep_id, rank: creep.rank })
                }
            }
        }


        // makes sure the most important creeps are on top of the queue
        // so if something like a harvester dies, the colony doesn't need to wait while
        // other less important creeps are being made
        queue.sort((arg1: TaskStackItem, arg2: TaskStackItem) => {
            let more_important = 0
            if (arg1.rank.get() < arg2.rank.get()) {
                more_important = -1
                if (arg1.rank.get() < 0) {
                    more_important = Number.MAX_SAFE_INTEGER
                }
            }
            else if (arg1.rank.get() > arg2.rank.get()) {
                more_important = 1
            }
            return more_important
        })

        const item = queue.peek()

        if (item) {
            // data used in creep creation
            const body = CommonFunctions.createBody(item.task.body)
            const name = `${CommonFunctions.createName(item.task.getRole())} - ${spawn.room.name}`
            const role = CommonFunctions.createMemData(item.task.getRole(), spawn.room.name)

            // creates the creep
            const status = spawn.spawnCreep(body, name, role)
            CommonFunctions.filterPrint(spawn.room.name, 0, status)

            // data used to decide if the current item on the queue should be popped
            const room_name = spawn.room.name
            const role_name = item.task.getRole()
            const is_last_queued = item.id === this.requests.get(room_name, role_name)
            const is_creation_complete = !item.task.shouldSpawn()

            // data used to check if a creep should be used to make a new CreepDeathWatcher


            if (is_creation_complete && is_last_queued) {
                queue.pop()
                this.requests.delete(room_name, role_name)
            }
            else if (is_creation_complete) {
                CommonFunctions.filterPrint(room_name, 1, "complete creating")
                queue.pop()
            }
        }
    }

    /**
     * used to make sure existing creeps are tracked by a DeathWatcher when the script is restarted
     *
     * @param   {Creep}  creep  creep to be watched
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    private addCreepsToDeathWatchers(creep: Creep | null | undefined): void {
        if (creep && !this.creeps.has(creep.room.name, creep.id) && !creep.spawning) {
            for (const creep_behaviors of this.creep_behaviors) {
                if (creep.memory.role === creep_behaviors.task.getRole()) {
                    this.creeps.set(creep.room.name, creep.id, new CreepStateWatcher(creep, creep_behaviors.task))
                    break
                }
            }
        }
    }

    /**
     * runs all the creep tasks in a given room
     *
     * @param   {RoomManager}  manager  gives resources to the current room being processed
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    private loop(manager: RoomManager): void {
        this.start()

        // list to keep track of dead creeps
        const creepers_to_remove = new Array<string>()

        // the key for a 2d map
        // used to make sure the code of each creep in each room is only run once per tick
        const room_name = manager.getRoom()?.name

        if (room_name) {

            // runs creeps in only the current room being processed
            this.creeps.forEach(room_name, (creep, id,) => {

                let is_alive = false

                if (creep.curRoom === room_name) {
                    is_alive = creep.onRun()
                }

                if (!is_alive) {
                    creepers_to_remove.push(id)
                }
            })

            for (const id of creepers_to_remove) {
                this.creeps.delete(room_name, id)
            }
        }

    }

    start() {
        const creeps_in_room = RoomManager.getInstance().getMyCreeps()
        for (const creep of creeps_in_room) {
            this.addCreepsToDeathWatchers(creep)
        }
    }


    /**
     * creates new creeps and runs all creep tasks of existing creeps
     *
     * @return  {[type]}  [return description]
     */
    run(): void {

        try {
            // data used to spawn new creeps
            const struct_type: StructureConstant[] = [STRUCTURE_SPAWN]
            const manager = RoomManager.getInstance()
            const spawns_in_room = manager.getMyStructs(struct_type)
            let spawn: StructureSpawn | null = null

            this.loop(manager)

            if (spawns_in_room.length > 0) {
                spawn = spawns_in_room[0] as StructureSpawn
                this.create(spawn)
            }

        }
        catch (_e) {
            const err = _e as Error

            console.log(err.stack)
            console.log(err.message)
        }

    }


}