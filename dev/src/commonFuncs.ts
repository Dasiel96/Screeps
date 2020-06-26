import { flags } from "./enums"
import { Body } from "./interfaces"
import { WhiteList } from "./whiteListed"


export class CommonFunctions {

    private static num_of_tasks = 0
    private static readonly hash_of_rooms = new Map<string, Room>()
    private static cur_room: Room | undefined
    private static new_room_spawn = "new room spawn"

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
            body.push(body_part_type)
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

    private static getBiggestPossibleBody(body: Body) {
        const max_extensions = 60
        const max_store_per_extension = 200
        const max_energy_per_spawn = 300
        const num_of_spawns = this.cur_room?.find(FIND_MY_STRUCTURES, {
            filter: (struct) => {
                return struct.structureType === STRUCTURE_SPAWN
            }
        }).length

        const body_container = Array<BodyPartConstant>()

        if (num_of_spawns !== undefined && CommonFunctions.num_of_tasks > 0) {
            let max_energy_for_body = (max_extensions * max_store_per_extension) + (num_of_spawns * max_energy_per_spawn)
            max_energy_for_body /= CommonFunctions.num_of_tasks

            let num_of_part_types_included = 0

            const body_parts = [MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL, TOUGH, CLAIM]
            for (const part of body_parts) {
                if (body[part] > 0) {
                    num_of_part_types_included++
                }
            }

        }

        return body_container
    }

    static setNumOfTasks(num: number) {
        CommonFunctions.num_of_tasks = num
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
    static pathOptions(ignore: boolean = true): MoveToOpts {
        return {
            visualizePathStyle: { stroke: "#ffffee" },
            reusePath: 10,
            ignoreCreeps: false,
        }
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
        const available_energy = this.cur_room?.energyCapacityAvailable
        const parts = [WORK, CARRY, MOVE, TOUGH, ATTACK, RANGED_ATTACK, HEAL, CLAIM]
        const included_parts = Array<BodyPartConstant>()

        for(const part of parts){
            if(body[part]){
                included_parts.push(part)
            }
        }

        while(available_energy && this.calcEnergyCostForBody(body) > available_energy){
            const part_type = included_parts[i%included_parts.length]
            if(body[part_type] - 1 > 0){
                body[part_type]--
            }
            i++
        }


        CommonFunctions.addBodyPartToBody(body.tough, TOUGH, body_container)
        CommonFunctions.addBodyPartToBody(body.claim, CLAIM, body_container)
        CommonFunctions.addBodyPartToBody(body.work, WORK, body_container)
        CommonFunctions.addBodyPartToBody(body.carry, CARRY, body_container)
        CommonFunctions.addBodyPartToBody(body.attack, ATTACK, body_container)
        CommonFunctions.addBodyPartToBody(body.ranged_attack, RANGED_ATTACK, body_container)
        CommonFunctions.addBodyPartToBody(body.heal, HEAL, body_container)
        CommonFunctions.addBodyPartToBody(body.move, MOVE, body_container)


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
                game_object_id: ""
            }
        }

        return mem_data
    }

    static getMyCreeps(role: string, room_entity: StructureSpawn | Room | Creep): Creep[] {
        const creep_filter: FilterOptions<FIND_MY_CREEPS> = { filter: (creep) => { return creep.memory.role === role } }

        let my_creeps
        if(room_entity instanceof StructureSpawn){
            my_creeps = room_entity.room.find(FIND_MY_CREEPS, creep_filter)
        }
        else if(room_entity instanceof Creep){
            my_creeps = room_entity.room.find(FIND_MY_CREEPS, creep_filter)
        }
        else{
            my_creeps = room_entity.find(FIND_MY_CREEPS, creep_filter)
        }
        return my_creeps
    }

    static getHostileCreeps(part?: BodyPartConstant) {
        const filter: FilterOptions<FIND_HOSTILE_CREEPS> = {
            filter: (creep) => {
                let has_part = false
                for (const body_part of creep.body) {
                    if (body_part.type === part || part === undefined) {
                        has_part = true
                        break
                    }
                }
                return has_part && !WhiteList.has(creep.owner.username)
            }
        }

        return this.cur_room?.find(FIND_HOSTILE_CREEPS, filter)
    }

    static getFriendlyCreeps() {
        const filter: FilterOptions<FIND_HOSTILE_CREEPS> = {
            filter: (creep) => {
                return WhiteList.has(creep.owner.username)
            }
        }
        return this.cur_room?.find(FIND_HOSTILE_CREEPS, filter)
    }

    static addRoom(room: Room) {
        if (!this.hash_of_rooms.has(room.name)) {
            this.hash_of_rooms.set(room.name, room)
        }
    }

    static hasRoom(room: Room) {
        return this.hash_of_rooms.has(room.name)
    }

    static setRoom(room: Room) {
        this.cur_room = this.hash_of_rooms.get(room.name)
    }

    static setNewRoomSpawn(site: ConstructionSite, room: Room){
        let flag = Game.flags[flags[flags.construction]]
        if(!flag){
            flag = Game.flags[flags[flags.construction]]
        }
        if(flag && site){
            flag.memory[this.new_room_spawn] = site.id
        }
    }

    static getNewRoomSpawn(){
        const flag = Game.flags[flags[flags.construction]]
        let construction_site: ConstructionSite | null = null

        if(flag){
            construction_site = Game.getObjectById<ConstructionSite>(flag.memory[this.new_room_spawn])
            if(construction_site === null){
                flag.remove()
            }
        }

        return construction_site
    }

    static getRoom() {
        return this.cur_room
    }

    static getFlagName(flag_name: number, room: Room) {
        return `${flags[flag_name]} ${room.name}`
    }
}
