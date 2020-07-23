import { CreepTask } from "./creepTasks"

export interface Body{
    work: number,
    carry: number,
    move: number,
    tough: number,
    attack: number,
    ranged_attack: number,
    heal: number,
    claim: number
}

export interface Task {
    task_name: string,
    creep_task: CreepTask
}