import { CreepTask } from "./creepTasks"
import { flags, task_names } from "./enums"
import { CommonFunctions } from "./commonFuncs"
import { Upgrader } from "./upgrader"
import { RoomManager } from "./roomManager"

export class Claimer extends CreepTask {

    private ticks_to_live = 0
    private upgrader = new Upgrader()
    private room_manager: RoomManager | null = null

    protected role: string = task_names[task_names.claimer];

    /**
     * this class is used to claim or reserve other rooms not yet under my control
     */
    constructor() {
        super();
    }

    /**
     * @returns a number representing how many claimers currently exist across all rooms
     * @author Daniel Schechtman
     */
    private getNumOfClaimers(): number {
        let num_of_claimers = 0
        for (const creep_name in Game.creeps) {
            const creep = Game.creeps[creep_name]
            if (creep.memory.role === this.role) {
                num_of_claimers++
                if (this.ticks_to_live < creep.ticksToLive!!) {
                    this.ticks_to_live = creep.ticksToLive!!
                }
            }
        }
        return num_of_claimers
    }

    protected runLogic(creep: Creep): void {
        if (!this.room_manager) {
            this.room_manager = RoomManager.getInstance()
        }

        const becon = flags[flags.becon]
        const becon_flag = Game.flags[becon]

        const room_to_claim = becon_flag.room
       



        if (room_to_claim !== undefined) {
            const foriegn_structs = this.room_manager.getHostileStructs()
            const foriegn_constructs = this.room_manager.getHostileConstructionSites()

            const struct_types: StructureConstant[] = [STRUCTURE_SPAWN]

            const spawns = this.manager.getMyStructs(struct_types)

            for (const s of foriegn_structs) {
                Game.getObjectById<AnyOwnedStructure>(s.id)?.destroy()
            }
            

            for (const cs of foriegn_constructs) {
                cs.remove()
            }
            
            const owner = room_to_claim.controller?.owner?.username
            CommonFunctions.filterPrint(room_to_claim.name, 2, `room owner: ${owner}, creep room: ${creep.room.name}, controller: ${room_to_claim.controller}`)

            if (!owner && creep.room.name !== room_to_claim.name) {
                const controller = room_to_claim.controller
                if (controller) {
                    creep.moveTo(controller, CommonFunctions.pathOptions(this.role))
                }
            }
            else {
                const spawn_pos = flags[flags.new_room_spawn_pos]
                const spawn_pos_flag = Game.flags[spawn_pos]


                const construct_flag = Game.flags[flags[flags.construction]]

                const spawn_construction_sites = this.room_manager.getMyConstructionSites()

                const has_control = room_to_claim.controller?.owner?.username === creep.owner?.username

                if (spawn_construction_sites.length === 0 && spawns.length === 0 && has_control) {
                    const spawn_name = `spawn ${room_to_claim.name}`
                    room_to_claim.createConstructionSite(spawn_pos_flag.pos, STRUCTURE_SPAWN, spawn_name)
                } else if (spawns.length === 0 && has_control) {


                    if (!construct_flag) {
                        room_to_claim.createFlag(24, 24, flags[flags.construction])
                    }

                    const new_spawn = CommonFunctions.getNewRoomSpawn()

                    if (!new_spawn && spawn_construction_sites) {
                        CommonFunctions.setNewRoomSpawn(spawn_construction_sites[0], room_to_claim)
                    }
                }

                const controller = room_to_claim.controller

                if (controller) {
                    if (owner === creep.owner.username) {
                        this.upgrader.run(creep)
                        room_to_claim.storage?.destroy()
                    }
                    else if (!owner && creep.claimController(controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(controller, CommonFunctions.pathOptions())
                    }
                    else if (!owner && creep.claimController(controller) === ERR_GCL_NOT_ENOUGH){
                        if (creep.reserveController(controller) === ERR_NOT_IN_RANGE){
                            creep.moveTo(controller, CommonFunctions.pathOptions())
                        }
                    }
                }

                

                if (room_to_claim.controller && room_to_claim.controller.safeMode === 0 && room_to_claim.controller.level === 2) {
                    room_to_claim.controller.activateSafeMode()
                }

                if (room_to_claim.controller && room_to_claim.controller.level === 2) {
                    becon_flag.remove()
                    creep.suicide()
                    
                }
            }
        }
        else {
            const flags_in_room = this.room_manager.getFlags()
            let becon_found = false

            for (const flag of flags_in_room){
                if (flag.name === flags[flags.becon]){
                    becon_found = true
                    break
                }
            }

            if (becon_found) {
                const controller = creep.room.controller
                if (controller !== undefined) {
                    const close_structs = creep.pos.findInRange(FIND_STRUCTURES, 1)

                    for (const barrier of close_structs) {
                        creep.dismantle(barrier)
                    }

                    let status = creep.claimController(controller)

                    if (status === ERR_GCL_NOT_ENOUGH) {
                        status = creep.reserveController(controller)
                    }

                    if (status === ERR_NOT_IN_RANGE) {
                        creep.moveTo(controller, CommonFunctions.pathOptions(this.role))
                    }
                }
            }
            else {    
                creep.moveTo(becon_flag, CommonFunctions.pathOptions())
            }
        }
    }

    protected createLogic(): boolean {
        this.skeleton.claim = 2
        this.skeleton.move = 4
        this.skeleton.work = 1
        this.skeleton.carry = 2

        let becon_flag = Game.flags[flags[flags.becon]]
        const num_of_claimers = this.getNumOfClaimers()
        this.num_of_creeps = num_of_claimers
        const claimer_about_to_die = this.ticks_to_live >= 1 && this.ticks_to_live <= 100
        const spawn_cost = CommonFunctions.calcEnergyCostForBody(this.skeleton)
        const available_energy_cap = this.manager.getRoom()!!.energyCapacityAvailable
        const has_enough_enegy = spawn_cost <= available_energy_cap

        const shoud_spawn = becon_flag && (num_of_claimers < this.cap || claimer_about_to_die) && has_enough_enegy

        return shoud_spawn
    }

    getRole(): string {
        return this.role
    }

}

 /*  */