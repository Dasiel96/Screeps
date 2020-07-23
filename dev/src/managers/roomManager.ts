import { flags } from "../enums"


interface Structure {
    owner: string | undefined | null,
    id: string,
    type: string,
    struct: AnyStructure,
}

export class RoomManager {
    private readonly HOSTILE = FIND_HOSTILE_CREEPS.toString()

    private readonly my_room_structures = new Map<string, Array<Structure>>()
    private readonly hostile_room_structures = new Map<string, Array<Structure>>()
    private readonly room_creeps = new Map<string, Array<Creep>>()
    private readonly room_debug_number_flags = new Map<string, null>()

    private readonly my_construction_sites = new Array<ConstructionSite>()
    private readonly hostile_construction_sites = new Array<ConstructionSite>()
    private readonly room_sources = new Array<Source>()
    private readonly room_flags = new Array<Flag>()

    private static instance: RoomManager | null = null

    private room: Room | null = null
    private readonly username = "DasBootLoader2"

    private constructor() { }

    private storeStructs(store: Map<string, Array<Structure>>, struct_type: string, struct: Structure) {
        if (!store.has(struct_type)) {
            store.set(struct_type, new Array<Structure>())
        }

        store.get(struct_type)!!.push(struct)
    }

    private storeCreep(role: string, creep: Creep) {
        if (!this.room_creeps.has(role)) {
            this.room_creeps.set(role, new Array<Creep>())
        }

        this.room_creeps.get(role)!!.push(creep)
    }

    private generateStructure(owner_string: string | null | undefined, id_string: string, type_string: string, s: AnyStructure) {
        const struct: Structure = {
            owner: owner_string,
            id: id_string,
            type: type_string,
            struct: s,
        }
        return struct
    }

    private isOwnerlessStructs(struct: AnyStructure) {
        let is_unowned = false
        const unowned_types: StructureConstant[] = [
            STRUCTURE_WALL,
            STRUCTURE_CONTAINER,
            STRUCTURE_ROAD,
            STRUCTURE_POWER_BANK,
        ]

        for (const type of unowned_types) {
            if (struct.structureType === type) {
                is_unowned = true
                break
            }
        }

        return is_unowned

    }

    // test
    private createRoad(creep: Creep) {
        const x = creep.pos.x
        const y = creep.pos.y
        const terrian = creep.room.getTerrain()
        const structures = creep.pos.lookFor(LOOK_STRUCTURES)
        const controller = creep.room.controller

        let found_road = false

        for (const structs of structures) {
            if (structs.structureType === STRUCTURE_ROAD) {
                found_road = true
                break
            }
        }

        if (controller) {
            const controller_owner = controller.owner?.username
            const creep_owner = creep.owner.username

            if (!found_road && terrian.get(x, y) === TERRAIN_MASK_SWAMP && controller_owner === creep_owner) {
                creep.pos.createConstructionSite(STRUCTURE_ROAD)
            }
        }
    }

    private makeDebugFlag() {
        const flags_in_room = this.getFlags()
        const name = `${flags[flags.debug_flag]} - ${this.room_debug_number_flags.size}`
        let flag_found = false

        for (const flag of flags_in_room) {
            if (flag.name === name) {
                flag_found = true
                break
            }
        }

        if (!flag_found) {
            this.room?.createFlag(24, 24, name)
        }
    }

    static getInstance() {
        if (this.instance === null) {
            this.instance = new RoomManager()
        }

        return this.instance
    }

    process(room: Room) {
        this.clear()

        this.room = room
        const all_my_structs = room.find(FIND_MY_STRUCTURES)
        const all_enemy_structs = room.find(FIND_HOSTILE_STRUCTURES)
        const all_unowned_structs = room.find(FIND_STRUCTURES, { filter: (s) => { return this.isOwnerlessStructs(s) } })

        const all_my_construction_sites = room.find(FIND_MY_CONSTRUCTION_SITES)
        const all_enemy_construction_sites = room.find(FIND_HOSTILE_CONSTRUCTION_SITES)

        const all_my_creeps = room.find(FIND_MY_CREEPS)
        const all_hostile_creeps = room.find(FIND_HOSTILE_CREEPS)

        const all_sources = room.find(FIND_SOURCES)

        const all_flags = room.find(FIND_FLAGS)


        for (const my_struct of all_my_structs) {
            const struct = this.generateStructure(my_struct.owner.username, my_struct.id, my_struct.structureType, my_struct)
            this.storeStructs(this.my_room_structures, struct.type, struct)
        }

        for (const unowned_struct of all_unowned_structs) {
            const struct = this.generateStructure(null, unowned_struct.id, unowned_struct.structureType, unowned_struct)
            this.storeStructs(this.my_room_structures, struct.type, struct)
        }

        for (const enemy_struct of all_enemy_structs) {
            const struct = this.generateStructure(enemy_struct.owner.username, enemy_struct.id, enemy_struct.structureType, enemy_struct)
            this.storeStructs(this.hostile_room_structures, struct.type, struct)
        }


        for (const creep of all_my_creeps) {
            this.storeCreep(creep.memory.role, creep)
            this.createRoad(creep)
        }

        for (const creep of all_hostile_creeps) {
            this.storeCreep(this.HOSTILE, creep)
        }

        for (const source of all_sources) {
            this.room_sources.push(source)
        }

        for (const site of all_my_construction_sites) {
            this.my_construction_sites.push(site)
        }

        for (const site of all_enemy_construction_sites) {
            this.hostile_construction_sites.push(site)
        }

        for (const flag of all_flags) {
            this.room_flags.push(flag)
        }

        if (!this.room_debug_number_flags.has(room.name) && this.isOwned(room)) {
            this.makeDebugFlag()
            this.room_debug_number_flags.set(room.name, null)  
        }
    }

    getMyStructs(struct_types: StructureConstant[] = [], callback?: (struct_type: AnyStructure) => boolean) {
        let structs = new Array<AnyStructure>()

        if (struct_types.length > 0) {
            for (let i = 0; i < struct_types.length; i++) {
                if (this.my_room_structures.has(struct_types[i])) {
                    for (const s of this.my_room_structures.get(struct_types[i])!!) {
                        if (callback === undefined || callback(s.struct)) {
                            structs.push(s.struct)
                        }
                    }
                }
            }
        }
        else {

            this.my_room_structures.forEach((val, key) => {
                for (const s of val) {
                    if (callback === undefined || callback(s.struct)) {
                        structs.push(s.struct)
                    }
                }
            })
        }


        return structs
    }

    getHostileStructs(struct_type: StructureConstant[] = [], callback?: (s: AnyStructure) => boolean) {
        let structs = new Array<AnyStructure>()

        if (struct_type.length > 0) {
            for (const type of struct_type) {
                if (this.hostile_room_structures.has(type)) {
                    for (const s of this.hostile_room_structures.get(type)!!) {
                        if (callback === undefined || callback(s.struct)) {
                            structs.push(s.struct)
                        }
                    }
                }
            }
        }
        else {
            this.hostile_room_structures.forEach((val, key) => {
                for (const s of val) {
                    if (callback === undefined || callback(s.struct)) {
                        structs.push(s.struct)
                    }
                }
            })
        }

        return structs
    }

    getMyCreeps(...role: string[]) {
        let creeps = new Array<Creep>()

        if (role.length > 0) {
            for (let i = 0; i < role.length; i++) {
                if (this.room_creeps.has(role[i])) {
                    for (const creep of this.room_creeps.get(role[i])!!) {
                        creeps.push(creep)
                    }
                }
            }
        }
        else {
            this.room_creeps.forEach((val, key) => {
                if (key !== this.HOSTILE) {
                    for (const c of val) {
                        creeps.push(c)
                    }
                }
            })
        }

        return creeps
    }

    getHostileCreeps() {
        let creeps = new Array<Creep>()
        if (this.room_creeps.has(this.HOSTILE)) {
            creeps = creeps.concat(this.room_creeps.get(this.HOSTILE)!!)
        }
        return creeps
    }

    getSources() {
        return this.room_sources
    }

    getMyConstructionSites() {
        return this.my_construction_sites
    }

    getHostileConstructionSites() {
        return this.hostile_construction_sites
    }

    getFlags() {
        return this.room_flags
    }

    getRoom() {
        return this.room
    }

    isOwned(room: Room): boolean {
        return room.controller?.owner?.username === this.username
    }

    private clear() {
        this.my_room_structures.clear()
        this.hostile_room_structures.clear()
        this.room_creeps.clear()
        this.room_sources.splice(0, this.room_sources.length)
        this.my_construction_sites.splice(0, this.my_construction_sites.length)
        this.hostile_construction_sites.splice(0, this.hostile_construction_sites.length)
        this.room_flags.splice(0, this.room_flags.length)
    }
}