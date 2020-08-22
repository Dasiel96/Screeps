import { CreepTask } from "./creepTasks";
import { flag_names, task_names } from "../enums";
import { CommonFunctions } from "../commonFuncs";
import { Upgrader } from "./upgrader";
import { CreepData } from "../interfaces";

export class Claimer extends CreepTask {


    private upgrader = new Upgrader()

    protected role: string = task_names[task_names.claimer];

    /**
     * this class is used to claim or reserve other rooms not yet under my control
     * also will upgrade the controller of newly claimed rooms
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

            }
        }
        return num_of_claimers
    }

    /**
     * gets all flags across all rooms that contain the substring "becon"
     *
     * @return  {Array<string>} list of flag names
     * @author Daniel Schechtman
     */
    private getAllBeconFlags(): Array<string> {
        const all_becons = new Array<string>()

        for (const flag_name in Game.flags) {
            if (flag_name.includes(flag_names[flag_names.becon])) {
                all_becons.push(flag_name)
            }
        }

        all_becons.sort((a: string, b: string) => {
            let lesser = 0
            if (a > b) {
                lesser = 1
            }
            else if (a < b) {
                lesser = -1
            }
            return lesser
        })

        return all_becons
    }

    private removeHostileStructures() {
        const foriegn_structs = this.manager.getHostileStructs()
        const foriegn_constructs = this.manager.getHostileConstructionSites()


        for (const s of foriegn_structs) {
            s.destroy()
        }

        for (const cs of foriegn_constructs) {
            cs.remove()
        }
    }

    protected startLogic(creep: Creep): void {

    }

    protected runLogic(creep: Creep): void {
        const becon_list = this.getAllBeconFlags()

        if (becon_list.length > 0) {
            const becon_flag = Game.flags[becon_list[0]]
            const room_to_claim = becon_flag.room

            const owned = this.manager.isOwned(room_to_claim)

            if (owned) {
                if (creep.room.name === room_to_claim?.name) {
                    this.removeHostileStructures()

                    const spawns = this.manager.getMyStructs([STRUCTURE_SPAWN])
                    const construction_sites = this.manager.getMyConstructionSites()
                    const new_spawn_construction_site = CommonFunctions.getNewRoomSpawn()
                    const construction_flag = Game.flags[flag_names[flag_names.construction]]

                    if (spawns.length === 0 && !new_spawn_construction_site) {
                        let spawn_site_found = false
                        let spawn_construction_sites: ConstructionSite | null = null

                        for (const site of construction_sites) {
                            if (site.structureType === STRUCTURE_SPAWN) {
                                spawn_site_found = true
                                spawn_construction_sites = site
                                break
                            }
                        }

                        if (!spawn_site_found) {
                            const spawn_flag_name = flag_names[flag_names.new_room_spawn_pos]
                            const all_flags = this.manager.getFlags()
                            let spawn_pos_flag: Flag | null = null

                            for (const flag of all_flags) {
                                if (flag.name.includes(spawn_flag_name)) {
                                    spawn_pos_flag = flag
                                    break
                                }
                            }


                            if (spawn_pos_flag) {
                                const spawn_name = `spawn ${room_to_claim!!.name}`
                                const type = STRUCTURE_SPAWN
                                spawn_pos_flag.pos.createConstructionSite(type, spawn_name)
                            }
                        }
                        else if (!construction_flag) {
                            CommonFunctions.setNewRoomSpawn(spawn_construction_sites!!, room_to_claim!!)
                            room_to_claim!!.createFlag(24, 24, flag_names[flag_names.construction])
                        }
                    }
                    else if (spawns.length > 0) {
                        construction_flag.remove()
                    }

                    this.upgrader.onRun(creep)
                }
                else {
                    creep.moveTo(becon_flag, CommonFunctions.pathOptions());
                }

                if (room_to_claim!!.controller && room_to_claim!!.controller.safeMode === 0 && room_to_claim!!.controller.level === 2) {
                    room_to_claim!!.controller.activateSafeMode()
                    becon_flag.remove()
                    creep.suicide()
                }
            }
            else {
                const in_room = creep.room.name === becon_flag.room?.name
                if (in_room) {
                    const controller = creep.room.controller
                    if (controller) {
                        let status = creep.claimController(controller)

                        if (status === ERR_GCL_NOT_ENOUGH) {
                            status = creep.reserveController(controller)
                        }

                        if (status === ERR_NOT_IN_RANGE) {
                            creep.moveTo(controller, CommonFunctions.pathOptions())
                        }
                    }
                }
                else {
                    creep.moveTo(becon_flag, CommonFunctions.pathOptions())
                }
            }
        }

    }

    protected spawnCheck(): boolean {
        this.skeleton.claim = 2
        this.skeleton.move = 5
        this.skeleton.work = 1
        this.skeleton.carry = 2

        let becon_flags = this.getAllBeconFlags()
        const num_of_claimers = this.getNumOfClaimers()
        this.num_of_creeps = num_of_claimers

        const spawn_cost = CommonFunctions.calcEnergyCostForBody(this.skeleton)
        const available_energy_cap = this.manager.getRoom()!!.energyCapacityAvailable
        const has_enough_enegy = spawn_cost <= available_energy_cap

        const shoud_spawn = becon_flags.length > 0 && (num_of_claimers < this.cap) && has_enough_enegy

        return shoud_spawn
    }

    protected destroyLogic(creep: CreepData): void {

    }

    getRole(): string {
        return this.role
    }

}

/*
if (room_to_claim !== undefined) {
            this.removeHostileStructures()

            const struct_types: StructureConstant[] = [STRUCTURE_SPAWN]
            const spawns = this.manager.getMyStructs(struct_types)
            const owner = room_to_claim.controller?.owner?.username


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
                    const type = STRUCTURE_SPAWN
                    spawn_pos_flag.pos.createConstructionSite(type, spawn_name)

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
                        this.upgrader.onRun(creep)
                        room_to_claim.storage?.destroy()
                    }
                    else if (!owner && creep.claimController(controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(controller, CommonFunctions.pathOptions())
                    }
                    else if (!owner && creep.claimController(controller) === ERR_GCL_NOT_ENOUGH) {
                        if (creep.reserveController(controller) === ERR_NOT_IN_RANGE) {
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

            for (const flag of flags_in_room) {
                if (flag.name === flags[flags.becon]) {
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
 */