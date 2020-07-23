import { CreepTask } from "./creepTasks"
import { Harvester } from "./harvester"
import { TowerSupplier } from "./towerSupplier"
import { Defender } from "./defender"
import { Claimer } from "./claimer"
import { Builder } from "./builder"
import { DecayRepair } from "./decayRepair"
import { PerminentStructRepair } from "./perminentRepair"
import { Upgrader } from "./upgrader"
import { CommonFunctions } from "./commonFuncs"
import { RoomManager } from "./roomManager"
import { FIFOStack } from "./stack"
import { task_names } from "./enums"


interface TaskStackItem {
    task: CreepTask,
    id: number | undefined
    rank: number
}

class TaskOnStackCounter {
    private readonly counter = new Map<string, Map<string, number>>()

    add(room_name: string, task_role: string, val: number) {
        if (!this.counter.has(room_name)) {
            this.counter.set(room_name, new Map())
        }

        if (!this.counter.get(room_name)!!.has(task_role)) {
            this.counter.get(room_name)!!.set(task_role, val)
        }
    }

    get(room_name: string, task_role: string) {
        return this.counter.get(room_name)?.get(task_role)
    }

    delete(room_name: string, task_role: string) {
        this.counter.get(room_name)?.delete(task_role)
    }

    clear(room_name: string) {
        this.counter.get(room_name)?.clear()
    }

    addToTaskValue(room_name: string, task_role: string, add_val: number) {
        const counter_val = this.counter.get(room_name)?.get(task_role)
        if (counter_val !== undefined && counter_val + add_val >= 0) {
            this.counter.get(room_name)!!.set(task_role, counter_val + add_val)
        }
    }
}

export class CreepManager {
    private readonly creep_behaviors = new Array<TaskStackItem>()
    private readonly room_queues = new Map<string, FIFOStack<TaskStackItem>>()
    private readonly defender = new Defender()
    private readonly claimer = new Claimer()

    private readonly requests = new TaskOnStackCounter()

    private should_fill_queue = 0

    constructor() {

        this.creep_behaviors.push({
            task: new Harvester(),
            id: undefined,
            rank: 0,
        })
        this.creep_behaviors.push({
            task: this.defender,
            id: undefined,
            rank: 1,
        })
        this.creep_behaviors.push({
            task: new TowerSupplier(),
            id: undefined,
            rank: 2,
        })
        this.creep_behaviors.push({
            task: this.claimer,
            id: undefined,
            rank: 2,
        })
        this.creep_behaviors.push({
            task: new Builder(),
            id: undefined,
            rank: 3,
        })
        this.creep_behaviors.push({
            task: new DecayRepair(),
            id: undefined,
            rank: 3,
        })
        this.creep_behaviors.push({
            task: new PerminentStructRepair(),
            id: undefined,
            rank: 3,
        })
        this.creep_behaviors.push({
            task: new Upgrader(),
            id: undefined,
            rank: 3,
        })
    }

    private create(spawn: StructureSpawn) {
        if (!this.room_queues.has(spawn.room.name)) {
            this.room_queues.set(spawn.room.name, new FIFOStack())
        }

        const queue = this.room_queues.get(spawn.room.name)!!

        for (const creep of this.creep_behaviors) {
            if (creep.task.create()) {
                const room_name = spawn.room.name
                const role = creep.task.getRole()
                //CommonFunctions.filterPrint(room_name, 2, "creating")

                this.requests.add(room_name, role, 0)

                const cap = creep.task.creepCap
                const requests_on_stack = this.requests.get(room_name, role)

                for (let i = creep.task.existingCreeps; i < cap; i++) {

                    if (this.requests.get(room_name, role) === creep.task.creepCap) {
                        break
                    }
                    else {
                        this.requests.addToTaskValue(room_name, role, 1)
                        queue.push({ task: creep.task, id: this.requests.get(room_name, role)!!, rank: creep.rank })
                    }

                }
                //CommonFunctions.filterPrint(room_name, 2, queue.size())
            }
        }


        queue.sort((arg1: TaskStackItem, arg2: TaskStackItem) => {
            let more_important = 0
            if (arg1.rank < arg2.rank) {
                more_important = -1
                if (arg1.rank < 0) {
                    more_important = Number.MAX_SAFE_INTEGER
                }
            }
            else if (arg1.rank > arg2.rank) {
                more_important = 1
            }
            return more_important
        })


        const item = queue.peek()

        if (item) {
            const body = CommonFunctions.createBody(item.task.body)
            const name = `${CommonFunctions.createName(item.task.getRole())} - ${spawn.room.name}`
            const role = CommonFunctions.createMemData(item.task.getRole(), spawn.room.name)
            const status = spawn.spawnCreep(body, name, role)




            const room_name = spawn.room.name
            const role_name = item.task.getRole()

            //CommonFunctions.filterPrint(room_name, 2, status)

            const is_last_queued = item.id === this.requests.get(room_name, role_name)
            const is_creation_complete = !item.task.create()

            if (is_last_queued && is_creation_complete) {
                this.requests.delete(room_name, role_name)
                queue.pop()
            }
            else if (is_creation_complete) {
                queue.pop()
            }
        }
    }

    private loop(creep: Creep) {
        for (const task of this.creep_behaviors) {
            if (creep.memory.role === task.task.getRole()) {

                CommonFunctions.setRoom(creep.room)
                task.task.run(creep)

                break
            }
        }
    }

    run(room: Room) {

        const struct_type: StructureConstant[] = [STRUCTURE_SPAWN]

        const manager = RoomManager.getInstance()

        const spawns_in_room = manager.getMyStructs(struct_type)
        const creeps_in_room = manager.getMyCreeps()
        const harvesters_in_room = manager.getMyCreeps(task_names[task_names.harvester])

        let spawn: StructureSpawn | null = null

        if (spawns_in_room.length > 0) {
            spawn = spawns_in_room[0] as StructureSpawn
        }

        if (spawn) {
            this.create(spawn)
        }

        for (const creep of creeps_in_room) {
            this.loop(creep)
        }
    }
}