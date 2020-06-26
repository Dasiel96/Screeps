
import { CommonFunctions } from "./commonFuncs"
import { CreepTask } from "./creepTasks"
import { task_names } from "./enums"
export class Upgrader extends CreepTask {
    protected role = task_names[task_names.upgrader]

    protected log(){

    }

    getRole(): string {
        return this.role
    }

    protected runLogic(creep: Creep) {

        CommonFunctions.changeWorkingState(creep)


        if (!creep.memory.working) {
            let source: Source | StructureStorage = CommonFunctions.findClosestSource(creep)

            const store = creep.room.find(FIND_MY_STRUCTURES, {
                filter: (s) => {
                    return s.structureType === STRUCTURE_STORAGE && s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                }
            })
            let status: ScreepsReturnCode

            if(store.length > 0){
                source = store[0] as StructureStorage
                status = creep.withdraw(source, RESOURCE_ENERGY)
            }
            else{
                status = creep.harvest(source)
            }
            if (status === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, CommonFunctions.pathOptions())
            }
        }
        else {
            const controller = creep.room.controller
            if (controller != undefined && creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, CommonFunctions.pathOptions())
            }
        }
    }

    protected createLogic(master: StructureSpawn): boolean {
        const existing_upgraders = CommonFunctions.getMyCreeps(this.role, master).length
        const should_spawn = existing_upgraders < this.cap

        if (should_spawn) {

            this.skeleton.work = 3
            this.skeleton.carry = 4
            this.skeleton.move = 7

            const body = CommonFunctions.createBody(this.skeleton)
            const name = CommonFunctions.createName(this.role)
            const role = CommonFunctions.createMemData(this.role, master.room.name)

            master.spawnCreep(body, name, role)
        }
        
        return !should_spawn
    }
}