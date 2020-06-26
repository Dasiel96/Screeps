import { CreepTask } from "./creepTasks"
import { flags, task_names } from "./enums"
import { CommonFunctions } from "./commonFuncs"
import { Upgrader } from "./upgrader"

export class Claimer extends CreepTask {
    protected role: string = task_names[task_names.claimer];

    private ticks_to_live = 0
    private upgrader = new Upgrader()

    private has_claimed = false

    private getNumOfClaimers() {
        let i = 0
        for (const creep_name in Game.creeps) {
            const creep = Game.creeps[creep_name]
            if (creep.memory.role === this.role) {
                i++
                if (this.ticks_to_live < creep.ticksToLive!!) {
                    this.ticks_to_live = creep.ticksToLive!!
                }
            }
        }
        return i
    }

    private getSpawnConstructionSite(creep: Creep) {
        return creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: (s) => { return s.structureType === STRUCTURE_SPAWN } })
    }

    protected log(): void {
        throw new Error("Method not implemented.");
    }

    protected runLogic(creep: Creep) {
        const becon_flag = Game.flags[flags[flags.becon]]

        let owner = becon_flag?.room?.controller?.owner

        let claim_status: ScreepsReturnCode | null = null

        if (this.has_claimed) {
            const offset = 4
            const spawn_pos = Game.flags[flags[flags.new_room_spawn_pos]]
            let x = creep.room.controller!!.pos.x + offset
            let y = creep.room.controller!!.pos.y + offset

            const hostile_structs = creep.room.find(FIND_HOSTILE_STRUCTURES)

            for (const struct of hostile_structs) {
                struct.destroy()
            }

            const spawns = this.getSpawnConstructionSite(creep)

            if (spawns.length === 0) {
                let status
                if (spawn_pos) {
                    status = creep.room.createConstructionSite(spawn_pos.pos.x, spawn_pos.pos.y, STRUCTURE_SPAWN, `spawn ${creep.room.name}`)
                }
                else {
                    status = creep.room.createConstructionSite(x, y, STRUCTURE_SPAWN, `spawn ${creep.room.name}`)
                }

                while (status === ERR_INVALID_TARGET && !spawn_pos) {
                    if (y !== creep.pos.y) {
                        y--
                    }
                    else {
                        x--
                    }
                    status = creep.room.createConstructionSite(x, y, STRUCTURE_SPAWN, `spawn ${creep.room.name}`)
                }

                if (spawn_pos) {
                    spawn_pos.remove()
                }

            }
            else {

                if (!CommonFunctions.getNewRoomSpawn()) {
                    const sites = this.getSpawnConstructionSite(creep)
                    CommonFunctions.setNewRoomSpawn(sites[0], creep.room)
                }

                if (becon_flag) {
                    becon_flag.remove()
                }
                this.upgrader.run(creep)
                if (creep.room.controller?.level === 2 && !creep.room.controller.safeModeCooldown) {
                    creep.room.controller.activateSafeMode()
                }
            }

        }
        else {
            let reset = (owner && owner.username === creep.owner.username)
            if (creep.room.controller) {
                claim_status = creep.claimController(creep.room.controller)
            }

            if (claim_status === ERR_GCL_NOT_ENOUGH) {
                creep.reserveController(creep.room.controller!!)
            }
            else if (claim_status === OK || reset) {
                if (becon_flag && !reset) {
                    this.has_claimed = true
                    becon_flag.remove()
                }
                else if (becon_flag && reset) {
                    creep.moveTo(becon_flag.room?.controller!!)
                    this.has_claimed = creep.room.name === becon_flag.room!!.name
                }
                else {
                    this.has_claimed = true
                }
            }
            if (becon_flag) {
                creep.moveTo(becon_flag, CommonFunctions.pathOptions())
            }
        }

        if (owner && owner.username === creep.owner.username && creep.ticksToLive!! === 1) {
            this.has_claimed = false
            this.ticks_to_live = 0
            if (creep.room.controller!!.level < 2) {
                const x = creep.room.controller!!.pos.x
                const y = creep.room.controller!!.pos.y
                creep.room.createFlag(x, y, flags[flags.becon])
            }
        }
        this.ticks_to_live = creep.ticksToLive!!
    }

    protected createLogic(master: StructureSpawn): boolean {
        this.skeleton.claim = 2
        this.skeleton.move = 4
        this.skeleton.work = 1
        this.skeleton.carry = 2

        let becon_flag = Game.flags[flags[flags.becon]]
        const num_of_reservers = this.getNumOfClaimers()
        const claimer_about_to_die = this.ticks_to_live >= 1 && this.ticks_to_live <= 100
        const has_enough_enegy = CommonFunctions.calcEnergyCostForBody(this.skeleton) < master.room.energyCapacityAvailable

        const shoud_spawn = becon_flag && (num_of_reservers < this.cap || claimer_about_to_die) && has_enough_enegy

        if (shoud_spawn) {


            const body = CommonFunctions.createBody(this.skeleton)
            const name = CommonFunctions.createName(this.role)
            const role = CommonFunctions.createMemData(this.role, master.room.name)

            master.spawnCreep(body, name, role)
        }

        return !shoud_spawn
    }

    getRole(): string {
        return this.role
    }

}