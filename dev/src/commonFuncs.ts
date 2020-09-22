import { flag_names, task_names } from "./enums"
import { Body } from "./interfaces"
import { RoomManager } from "./managers/roomManager"


export class CommonFunctions {
    private static readonly hash_of_rooms = new Map<string, Room>()
    private static new_room_spawn = "new room spawn"
    private static room_names = new Array<string>()

    private static readonly energy_reqs: Body = {
        move: 50,
        work: 100,
        carry: 50,
        attack: 80,
        ranged_attack: 150,
        heal: 250,
        claim: 600,
        tough: 10,
    }

    private static addBodyPartToBody(body_part_num: number, body_part_type: BodyPartConstant, body: Array<BodyPartConstant>) {
        let energy_sum = 0
        for (let i = 0; i < body_part_num; i++) {
            if (body.length < 50) {
                body.push(body_part_type)
            }
            energy_sum += CommonFunctions.energy_reqs[body_part_type]
        }
        return energy_sum
    }

    static calcEnergyCostForBody(body: Body) {
        const body_part_list = [MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL, CLAIM, TOUGH]
        let cost = 0

        for (const part of body_part_list) {
            cost += CommonFunctions.energy_reqs[part] * body[part]
        }
        return cost
    }

    /**
     * calculates how many steps it will take to get to a specific
     * source. Then returns the one with the fewer steps
     * @param creep
     */
    static findClosestSource(creep: Creep): Source {
        return creep.pos.findClosestByPath(FIND_SOURCES)!!
    }

    /**
     * returns extra data to be used by the function creep.moveTo(body, name, moveToOpts)
     *
     */
    static pathOptions(creepType: string = "creep"): MoveToOpts {
        let opts: MoveToOpts = {
            visualizePathStyle: { stroke: "#ffffee" },
            reusePath: 15,
            ignoreCreeps: false,

        }

        if (creepType !== task_names[task_names.claimer]) {
            opts.swampCost = 2
            opts.plainCost = 2
        }
        return opts
    }

    /**
     * returns -1 if the creep is out of energy.
     * returns 1 if the creep can't harvest anymore energy.
     * returns 0 otherwise.
     * @param creep
     */
    static changeWorkingState(creep: Creep): number {
        const out_of_energy = creep.store.getUsedCapacity() === 0
        const carrying_max_capacity = creep.store.getCapacity() === creep.store.getUsedCapacity()

        let action_decision = 0

        if (out_of_energy) {
            creep.memory.working = false
            action_decision = -1
        }
        else if (carrying_max_capacity) {
            creep.memory.working = true
            action_decision = 1
        }

        return action_decision
    }

    static createBody(
        body: Body = {
            work: 1,
            carry: 1,
            move: 1,
            tough: 0,
            attack: 0,
            ranged_attack: 0,
            heal: 0,
            claim: 0
        }
    ): Array<BodyPartConstant> {
        const body_container: BodyPartConstant[] = []
        let i = 0
        const available_energy = RoomManager.getInstance().getRoom()?.energyCapacityAvailable
        const parts = [WORK, CARRY, MOVE, TOUGH, ATTACK, RANGED_ATTACK, HEAL, CLAIM]
        const included_parts = Array<BodyPartConstant>()

        const smallest_body: Body = {
            work: 0,
            carry: 0,
            move: 0,
            tough: 0,
            attack: 0,
            ranged_attack: 0,
            heal: 0,
            claim: 0,
        }

        let biggest_part = 0
        for (const part of parts) {
            if (body[part]) {
                included_parts.push(part)

                if (body[part] > biggest_part) {
                    biggest_part = body[part]
                }
            }
        }

        const show = (s: Body) => {
            const w = `Work: ${s.work}`
            const c = `Carry: ${s.carry}`
            const m = `Move: ${s.move}`
            const t = `Tough: ${s.tough}`
            const a = `Attack: ${s.attack}`
            const ra = `Ranged Attack: ${s.ranged_attack}`
            const h = `Heal: ${s.heal}`
            const cl = `Claim: ${s.claim}`
            return `${w} ${c} ${m} ${t} ${a} ${ra} ${h} ${cl}`
        }




        if (available_energy) {
            for (let i = 0; i < biggest_part; i++) {
                let is_at_limit = false
                for (const part of included_parts) {
                    if (smallest_body[part] < body[part]) {
                        let cost = this.calcEnergyCostForBody(smallest_body)
                        if (cost < available_energy) {
                            smallest_body[part]++
                            cost = this.calcEnergyCostForBody(smallest_body)
                        }

                        if (cost > available_energy) {
                            smallest_body[part]--
                        }
                        else if (cost === available_energy) {
                            is_at_limit = true
                            break
                        }
                    }
                }
                if (is_at_limit) {
                    break
                }
            }
        }

        CommonFunctions.addBodyPartToBody(smallest_body.tough, TOUGH, body_container)
        CommonFunctions.addBodyPartToBody(smallest_body.claim, CLAIM, body_container)
        CommonFunctions.addBodyPartToBody(smallest_body.work, WORK, body_container)
        CommonFunctions.addBodyPartToBody(smallest_body.carry, CARRY, body_container)
        CommonFunctions.addBodyPartToBody(smallest_body.attack, ATTACK, body_container)
        CommonFunctions.addBodyPartToBody(smallest_body.ranged_attack, RANGED_ATTACK, body_container)
        CommonFunctions.addBodyPartToBody(smallest_body.heal, HEAL, body_container)
        CommonFunctions.addBodyPartToBody(smallest_body.move, MOVE, body_container)

        //CommonFunctions.filterPrint("E47S18", 0, show())


        return body_container
    }

    static createName(creep_role: string): string {
        return `creep: ${creep_role} - ${Game.time}`
    }

    static createMemData(creep_role: string, room_name: string): SpawnOptions {
        const mem_data: SpawnOptions = {
            memory: {
                role: creep_role,
                room: room_name,
                working: false,
                create: false,
                game_object_id: ""
            }
        }

        return mem_data
    }

    static setRoom(room: Room) {
        if (!this.room_names.includes(room.name)) {
            this.room_names.push(room.name)
        }
    }

    static getRoomName(index: number) {
        let name = ""
        if (index >= 0 && index < this.room_names.length) {
            name = this.room_names[index]
        }
        return name
    }

    static filterPrint(room_name: string, index: number, ...message: any[]) {
        if (room_name === this.getRoomName(index)) {
            console.log(message.join(", "))
        }
    }

    static setNewRoomSpawn(site: ConstructionSite, room: Room) {
        let flag = Game.flags[flag_names[flag_names.construction]]
        if (!flag) {
            flag = Game.flags[flag_names[flag_names.construction]]
        }
        if (flag && site) {
            flag.memory[this.new_room_spawn] = site.id
        }
    }

    static getNewRoomSpawn() {
        const flag = Game.flags[flag_names[flag_names.construction]]
        let construction_site: ConstructionSite | null = null

        if (flag) {
            construction_site = Game.getObjectById<ConstructionSite>(flag.memory[this.new_room_spawn])
            if (construction_site === null) {
                flag.remove()
            }
        }

        return construction_site
    }

    static getFlagName(flag_name: number, room: Room) {
        return `${flag_names[flag_name]} ${room.name}`
    }
}
