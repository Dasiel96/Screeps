import { CreepTask } from "./creep-logic/creepTasks";

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

export interface CreepData {
    id: string,
    origin_room: string,
    cur_room: string,
    name: string,
    owner: string, 
    role: string,
}