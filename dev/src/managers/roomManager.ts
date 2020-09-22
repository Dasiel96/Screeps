import { flag_names } from "../enums"
import { UnsignedNumber } from "../unsignedNum"
import { TwoDemMap } from "../DataStructures/map"
import { hasUncaughtExceptionCaptureCallback } from "process"


interface Structure {
    owner: string | undefined | null,
    id: string,
    type: string,
}

export class RoomManager {
    private static instance: RoomManager | null = null

    private room: Room | null = null
    private room_obj_refresh_counter = new Map<string, UnsignedNumber>()
    private readonly refresh_val = 1
    private readonly HOSTILE = FIND_HOSTILE_CREEPS.toString()
    private readonly username = "DasBootLoader2"
    private readonly my_room_structures = new TwoDemMap<string, Array<Structure>>()
    private readonly hostile_room_structures = new TwoDemMap<string, Array<Structure>>()
    private readonly room_creeps = new TwoDemMap<string, Array<string>>()
    private readonly room_debug_number_flags = new Map<string, null>()
    private readonly my_construction_sites = new Map<string, Array<string>>()
    private readonly hostile_construction_sites = new Map<string, Array<string>>()
    private readonly room_sources = new Map<string, Array<string>>()
    private readonly room_flags = new Array<Flag>()

    private constructor() { }

    static getInstance() {
        if (this.instance === null) {
            this.instance = new RoomManager()
        }

        return this.instance
    }

    /**
     * stores structures into a map based on type
     *
     * @param   {Map<string>}           store        [store description]
     * @param   {string}                struct_type  [struct_type description]
     * @param   {Structure}             struct       [struct description]
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    private storeStructs(store: TwoDemMap<string, Array<Structure>>, struct_type: string, struct: Structure, room_name: string): void {
        if (!store.has(room_name, struct_type)) {
            store.add(room_name, struct_type, new Array<Structure>())
        }

        store.get(room_name, struct_type)!!.push(struct)
    }

    /**
     * deletes all data stored in memory
     * 
     * @author Daniel Schechtman
     */
    private clear(): void {
        this.room_creeps.clear()
        this.room_flags.splice(0, this.room_flags.length)
    }

    private clearStructures(room_name: string): void {
        this.my_room_structures.clearRow(room_name)
        this.hostile_room_structures.clearRow(room_name)
    }

    private clearConstructionSites(room_name: string): void {
        this.my_construction_sites.delete(room_name)
        this.hostile_construction_sites.delete(room_name)
    }

    /**
     * stores creeps into a map with their type being the key
     *
     * @param   {string}  role   which array the creep should be stored in
     * @param   {Creep}   creep  the creep to be stored
     *
     * @return  {void}           
     * @author Daniel Schechtman
     */
    private storeCreep(room_name: string, role: string, creep_id: string): void {
        if (!this.room_creeps.has(room_name, role)) {
            this.room_creeps.add(room_name, role, new Array())
        }
        this.room_creeps.get(room_name, role)!!.push(creep_id)
    }

    /**
     * creates an object that is more memory effiecent then storing a structure object
     *
     * @param   {string}        owner_string  name of the owner of the structure
     * @param   {string}        id_string     the id to find the structure
     * @param   {string}        type_string   the type of structure
     * @param   {AnyStructure}  s             [s description]
     *
     * @return  {[type]}                      [return description]
     */
    private generateStructure(
        owner_string: string | null | undefined,
        id_string: string,
        type_string: string,
    ): Structure {
        const struct: Structure = {
            owner: owner_string,
            id: id_string,
            type: type_string,
        }
        return struct
    }

    /**
     * checks if a structure is a type of structure that doesn't have an owner object
     * attached to it
     *
     * @param   {AnyStructure}  struct
     *
     * @return  {boolean}                returns true if the structure is a structure without a owner object, false otherwise
     * @author Daniel Schechtman
     */
    private isOwnerlessStructs(struct: AnyStructure): boolean {
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

    /**
     * creates a road construction site if a creep is on a swamp tile
     *
     * @param   {Creep}  creep  used to check the position of the creep
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    private createRoad(creep: Creep): void {
        const x = creep.pos.x
        const y = creep.pos.y

        const terrian = creep.room.getTerrain()
        const structures = creep.pos.lookFor(LOOK_STRUCTURES)

        let found_road = false

        for (const structs of structures) {
            if (structs.structureType === STRUCTURE_ROAD) {
                found_road = true
                break
            }
        }

        // makes sure I currently control the room
        // this way construction sites aren't needlessly
        // being created
        if (this.isOwned(creep.room)) {
            const is_swamp_tile = terrian.get(x, y) === TERRAIN_MASK_SWAMP
            if (!found_road && is_swamp_tile) {
                creep.pos.createConstructionSite(STRUCTURE_ROAD)
            }
        }
    }

    /**
     * makes a flag that allows me to know which room number I
     * want tu use to filter output in Commonfunctions.FilterPrint()
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    private makeDebugFlag(): void {
        const flags_in_room = this.getFlags()
        const name = `${flag_names[flag_names.debug_flag]} - ${this.room_debug_number_flags.size}`
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

    /**
     * makes various flags in the room used for various purposes in the colony
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    private makeRoomFlags(): void {
        const name_of_flags_to_make = [
            flag_names[flag_names.harvester_wait],
            flag_names[flag_names.supplier_wait],
            flag_names[flag_names.DAS],
            flag_names[flag_names.supply_link],
        ]
        const flags_in_room = this.getFlags()

        for (const flag_name of name_of_flags_to_make) {

            let flag_found = false
            const name = `${flag_name} ${this.room?.name}`

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
    }

    /**
     * creates construction sites for walls and ramparts, letting the placement of such structures
     * to be decided before it's possible to make construction sites to build them
     *
     * @return  {void}
     * @author Daniel Schechtman
     */
    private createBarrierConstructionSites(): void {

        // uses flags to determine where the construction sites should be placed
        const flags_in_room = this.getFlags()

        for (const flag of flags_in_room) {
            const wall_flag_name = flag_names[flag_names.wall]
            const rampart_flag_name = flag_names[flag_names.ramp]
            if (flag.name.includes(wall_flag_name)) {
                if (flag.pos.createConstructionSite(STRUCTURE_WALL) === OK) {
                    flag.remove()
                }
            }
            else if (flag.name.includes(rampart_flag_name)) {
                if (flag.pos.createConstructionSite(STRUCTURE_RAMPART) === OK) {
                    flag.remove()
                }
            }
        }

    }

    /**
     * will store structures id, type, and owner in memory, and update what is cached every 100 ticks
     *
     * @param   {Room}  room  used to find structures in the room
     *
     * @return  {void}      
     * @author Daniel Schechtman
     */
    private process_structures(room: Room): void {
        this.clearStructures(room.name)

        // used to cache structures into memory
        const all_my_structs = room.find(FIND_MY_STRUCTURES)
        const all_enemy_structs = room.find(FIND_HOSTILE_STRUCTURES)
        const all_unowned_structs = room.find(FIND_STRUCTURES, { filter: (s) => { return this.isOwnerlessStructs(s) } })

        for (const my_struct of all_my_structs) {
            const struct = this.generateStructure(my_struct.owner.username, my_struct.id, my_struct.structureType)
            this.storeStructs(this.my_room_structures, struct.type, struct, room.name)
        }

        for (const unowned_struct of all_unowned_structs) {
            const struct = this.generateStructure(null, unowned_struct.id, unowned_struct.structureType)
            this.storeStructs(this.my_room_structures, struct.type, struct, room.name)
        }

        for (const enemy_struct of all_enemy_structs) {
            const struct = this.generateStructure(enemy_struct.owner.username, enemy_struct.id, enemy_struct.structureType)
            this.storeStructs(this.hostile_room_structures, struct.type, struct, room.name)
        }
    }

    /**
     * finds and caches all construction site ids in the room
     *
     * @param   {Room}  room  used to find construction sites in the room
     *
     * @return  {void}        
     * @author Daniel Schechtman
     */
    private process_construction_sites(room: Room): void {
        this.clearConstructionSites(room.name)

        // used to cache construction sites
        const all_my_construction_sites = room.find(FIND_MY_CONSTRUCTION_SITES)
        const all_enemy_construction_sites = room.find(FIND_HOSTILE_CONSTRUCTION_SITES)

        if (!this.my_construction_sites.has(room.name)) {
            this.my_construction_sites.set(room.name, new Array())
        }

        if (!this.hostile_construction_sites.has(room.name)) {
            this.hostile_construction_sites.set(room.name, new Array())
        }

        for (const site of all_my_construction_sites) {
            this.my_construction_sites.get(room.name)?.push(site.id)
        }

        for (const site of all_enemy_construction_sites) {
            this.hostile_construction_sites.get(room.name)?.push(site.id)
        }
    }

    /**
     * caches all relevant data in room (structures, constructions sites, flags, sources, and creeps)
     * also does some checks to perform actions such as making roads and flags
     *
     * @param   {Room}  room  used to collect data in the room
     *
     * @return  {void}        
     * @author Daniel Schechtman
     */
    private process_room(room: Room): void {
        this.clear()

        this.room = room

        const all_hostile_creeps = room.find(FIND_HOSTILE_CREEPS)
        const my_creeps = room.find(FIND_MY_CREEPS)
        const all_flags = room.find(FIND_FLAGS)

        for (const creep of my_creeps) {
            this.storeCreep(room.name, creep.memory.role, creep.id)
            this.createRoad(creep)
        }

        for (const creep of all_hostile_creeps) {
            this.storeCreep(room.name, this.HOSTILE, creep.id)
        }

        for (const flag of all_flags) {
            this.room_flags.push(flag)
        }

        if (!this.room_debug_number_flags.has(room.name) && this.isOwned(room)) {
            this.makeDebugFlag()
            this.room_debug_number_flags.set(room.name, null)
        }

        if (this.isOwned(room)) {
            this.makeRoomFlags()
            this.createBarrierConstructionSites()

            const has_counter = this.room_obj_refresh_counter.has(room.name)
            const should_refresh = has_counter && this.room_obj_refresh_counter.get(room.name)!!.get() % this.refresh_val === 0

            if (!has_counter || should_refresh) {
                this.room_obj_refresh_counter.set(room.name, new UnsignedNumber(0))
                this.process_structures(room)
                this.process_construction_sites(room)
            }

            if (!this.room_sources.has(room.name)) {
                const all_sources = room.find(FIND_SOURCES)
                this.room_sources.set(room.name, new Array())
                for (const source of all_sources) {
                    this.room_sources.get(room.name)!!.push(source.id)
                }
            }

            this.room_obj_refresh_counter.get(room.name)!!.add(1)
        }
    }

    /**
     * returns an array of construction sites in the room
     *
     * @param   {string}                                              room_name  key to cached construction site ids
     * @param   {Map<string, Array<string>>}                          site_map   map holding cached construction sites
     *
     * @return  {Array<ConstructionSite>}                                        list of constructions sites made using site ids
     * @author Daniel Schechtman
     */
    private getConstructionSite(room_name: string | undefined, site_map: Map<string, Array<string>>): Array<ConstructionSite> {
        const construct_sites = new Array<ConstructionSite>()

        if (room_name && site_map.has(room_name)) {
            for (const site_id of site_map.get(room_name)!!) {
                const site = Game.getObjectById<ConstructionSite>(site_id)
                if (site) {
                    construct_sites.push(site)
                }
            }
        }

        return construct_sites
    }


    updateStructureList(): void {
        if (this.room) {
            this.process_structures(this.room)
        }
    }

    updateConstructionSiteList(): void {
        if (this.room) {
            this.process_construction_sites(this.room)
        }
    }

    /**
     * gets structures in the room that are cached in memory
     * 
     * @param {Array<StructureConstant>} struct_types list of structure types that are wanted to be retrieved
     * @param {TwoDemMap<string, Array<Structure>>} struct_map the map that keeps track of which room the structure is in
     * and what structure type a structure should be sorted into
     * @param {string | undefined} room_name the key to which room the script is trying to find structures in
     * @param {((s: AnyStructure, debug?: any) => boolean) | undefined} callback optional function that can be past in to filter results
     *
     * @return  {Array<AnyStructure>}
     * @author Daniel Schechtman
     */
    private getStructures(
        struct_types: StructureConstant[],
        struct_map: TwoDemMap<string, Structure[]>,
        room_name: string | undefined,
        callback: ((s: AnyStructure, debug?: any) => boolean) | undefined,
    ): Array<AnyStructure> {
        const structures = new Array<AnyStructure>()
        const indexes_to_remove = new Array<number>()
        const types_to_remove = new Array<StructureConstant | string>()

        if (room_name && struct_types.length > 0) {
            for (const type of struct_types) {
                if (struct_map.has(room_name, type)) {
                    const struct_list = struct_map.get(room_name, type)!!
                    for (const structure_data of struct_list) {
                        const a_struct_in_room = Game.getObjectById<AnyStructure>(structure_data.id)
                        if (a_struct_in_room && (callback === undefined || callback(a_struct_in_room))) {
                            structures.push(a_struct_in_room)
                        }
                        else if (a_struct_in_room === null) {
                            const index = struct_list.indexOf(structure_data)
                            indexes_to_remove.push(index)
                            if (!types_to_remove.includes(type)) {
                                types_to_remove.push(type)
                            }
                        }
                    }
                }
            }
        }
        else if (room_name) {
            struct_map.forEach(room_name, (struct_data, type) => {
                for (const struct of struct_data) {
                    const struct_from_id = Game.getObjectById<AnyStructure>(struct.id)
                    if (struct_from_id && (callback === undefined || callback(struct_from_id))) {
                        structures.push(struct_from_id)
                    }
                    else if (struct_from_id === null) {
                        const index = struct_map.get(room_name, type)!!.indexOf(struct)
                        indexes_to_remove.push(index)
                        if (!types_to_remove.includes(type)) {
                            types_to_remove.push(type)
                        }
                    }
                }
            })
        }

        if (room_name) {
            for (const type of types_to_remove) {
                for (const i of indexes_to_remove) {
                    struct_map.get(room_name, type)!!.splice(i, 1)
                }
            }
        }

        return structures
    }

    /**
     * wrapper function for this.process_room, ensures that the room is safely processed so
     * that the entire script doesn't crash if there's an error
     *
     * @param   {Room}  room  used to process data of the room
     *
     * @return  {void}        
     * @author Daniel Schechtman
     */
    process(room: Room): void {
        try {
            this.process_room(room)
        }
        catch (_e) {
            const err = _e as Error

            console.log(err.stack)
            console.log(err.message)
        }
    }

    /**
     * returns an array of structures in the room that I own or that don't have an owner
     *
     * @param {Array<StructureConstant>} struct_types the types of structures that are wanted to be returned
     * @param {((s: AnyStructure, debug?: any) => boolean) | undefined} callback optional function that can be used to filter results
     * 
     * @return  {Array<AnyStructure>} list of structures
     * @author Daniel Schechtman
     */
    getMyStructs(
        struct_types: StructureConstant[] = [],
        callback?: (struct_type: AnyStructure, debug?: any) => boolean
    ): AnyStructure[] {
        return this.getStructures(struct_types, this.my_room_structures, this.room?.name, callback)
    }

    /**
     * returns an array of structures in the room that I don't own
     *
     * @param {Array<StructureConstant>} struct_types the types of structures that are wanted to be returned
     * @param {((s: AnyStructure, debug?: any) => boolean) | undefined} callback optional function that can be used to filter results
     * 
     * @return  {Array<AnyStructure>} list of structures
     * @author Daniel Schechtman
     */
    getHostileStructs(
        struct_type: StructureConstant[] = [],
        callback?: (s: AnyStructure, debug?: any) => boolean
    ): AnyStructure[] {
        return this.getStructures(struct_type, this.hostile_room_structures, this.room?.name, callback)
    }

    /**
     * returns all creeps I own in the room
     *
     * @param   {string[]}  roles  used to filter what type of creeps I want to get
     *
     * @return  {Creep[]}
     * @author Daniel Schechtman
     */
    getMyCreeps(...roles: Array<string>): Creep[] {
        let creeps = new Array<Creep>()

        if (roles.length > 0) {
            for (let i = 0; i < roles.length; i++) {
                if (this.room && this.room_creeps.has(this.room.name, roles[i])) {
                    for (const creep_id of this.room_creeps.get(this.room.name, roles[i])!!) {
                        const creep = Game.getObjectById<Creep>(creep_id)

                        if (creep) {
                            creeps.push(creep)
                        }
                    }
                }
            }
        }
        else if (this.room) {
            this.room_creeps.forEach(this.room.name, (creep_id_list, creep_type) => {
                if (creep_type !== this.HOSTILE) {
                    for (const creep_id of creep_id_list) {
                        const creep = Game.getObjectById<Creep>(creep_id)

                        if (creep) {
                            creeps.push(creep)
                        }
                    }
                }
            })
        }

        return creeps
    }


    /**
     * returns all creeps in the room I don't own
     *
     * @param   {Array<BodyPartConstant>}           parts             helps filter what creeps I want in the list
     *
     * @return  {Array<Creep>}                                        
     * @author Daniel Schechtman
     */
    getHostileCreeps(...parts: Array<BodyPartConstant>): Array<Creep> {
        let creeps = new Array<Creep>()
        if (parts.length > 0 && this.room && this.room_creeps.has(this.room.name, this.HOSTILE)) {
            for (const hostile_creep_id of this.room_creeps.get(this.room.name, this.HOSTILE)!!) {
                let has_part = false
                const hostile_creep = Game.getObjectById<Creep>(hostile_creep_id)

                if (hostile_creep) {
                    for (const body_part_type of parts) {

                        for (const body_part of hostile_creep.body) {
                            if (body_part.type === body_part_type) {
                                has_part = true
                                break
                            }
                        }

                        if (has_part) {
                            break
                        }
                    }

                    if (has_part) {
                        creeps.push(hostile_creep)
                    }
                }
            }
        }
        else if (this.room && this.room_creeps.has(this.room.name, this.HOSTILE)) {
            for (const hostile_creep_id of this.room_creeps.get(this.room.name, this.HOSTILE)!!) {
                const hostile_creep = Game.getObjectById<Creep>(hostile_creep_id)

                if (hostile_creep) {
                    creeps.push(hostile_creep)
                }
            }
        }
        return creeps
    }

    getSources(): Source[] {
        const sources = new Array<Source>()

        if (this.room && this.room_sources.has(this.room.name)) {
            for (const source of this.room_sources.get(this.room.name)!!) {
                const energy_source = Game.getObjectById<Source>(source)
                if (energy_source) {
                    sources.push(energy_source)
                }
            }
        }

        return sources
    }

    getMyConstructionSites(): Array<ConstructionSite> {
        return this.getConstructionSite(this.room?.name, this.my_construction_sites)
    }

    getHostileConstructionSites(): Array<ConstructionSite> {
        return this.getConstructionSite(this.room?.name, this.hostile_construction_sites)
    }

    getFlags(): Flag[] {
        return this.room_flags
    }

    getRoom(): Room | null {
        return this.room
    }

    isOwned(room: Room | null | undefined): boolean {
        return room?.controller?.owner?.username === this.username
    }

    isUnderAttack(): boolean {
        return this.getHostileCreeps().length > 0
    }

    destroy(): void {
        // Automatically delete memory of missing creeps
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
                delete Memory.creeps[name];
            }
        }

        // Automatically deletes memory of missing flags
        for (const name in Memory.flags) {
            if (!(name in Game.flags)) {
                delete Memory.flags[name]
            }
        }
    }
}