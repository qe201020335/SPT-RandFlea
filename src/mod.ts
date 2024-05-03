import { DependencyContainer, Lifecycle } from "tsyringe";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { Statics } from "./statics";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { RandomizedRagfairOfferGenerator } from "./RandomizedRagfairOfferGenerator";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";
import { BotGeneratorHelper } from "@spt-aki/helpers/BotGeneratorHelper";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import { RandomUtil } from "@spt-aki/utils/RandomUtil";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { IPmcConfig } from "@spt-aki/models/spt/config/IPmcConfig";
import { IRepairConfig } from "@spt-aki/models/spt/config/IRepairConfig";
import { RepairService } from "@spt-aki/services/RepairService";
import { BotGenerationDetails } from "@spt-aki/models/spt/bots/BotGenerationDetails";
import { BotHelper } from "@spt-aki/helpers/BotHelper";
import { SaveServer } from "@spt-aki/servers/SaveServer";
import { BotLevelGenerator } from "@spt-aki/generators/BotLevelGenerator";
import { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import { EquipmentSlots } from "@spt-aki/models/enums/EquipmentSlots";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { BaseClasses } from "@spt-aki/models/enums/BaseClasses";
import { BotWeaponGenerator } from "@spt-aki/generators/BotWeaponGenerator";
import { RagfairOfferGenerator } from "@spt-aki/generators/RagfairOfferGenerator";
import { ITemplateItem } from "@spt-aki/models/eft/common/tables/ITemplateItem";

class Mod implements IPreAkiLoadMod
{
    private readonly mod: string
    private logger: ILogger
    private container: DependencyContainer;

    constructor()
    {
        this.mod = "SkyTweaks";
    }

    public preAkiLoad(container: DependencyContainer): void
    {
        this.container = container;
        this.logger = container.resolve<ILogger>("WinstonLogger");
        this.logger.info(`[${this.mod}] preAki Loading... `)
        Statics.container = container

        container.register<RandomizedRagfairOfferGenerator>("RandomizedRagfairOfferGenerator", RandomizedRagfairOfferGenerator);
        container.register("RagfairOfferGenerator", { useToken: "RandomizedRagfairOfferGenerator" });
        this.logger.success(`[${this.mod}] RagfairOfferGenerator override by RandomizedRagfairOfferGenerator.`)

        // container.afterResolution("RagfairOfferGenerator", (_t, result: RagfairOfferGenerator) =>
        // {
        //     result["createSingleOfferForItem"] = async (itemWithChildren: Item[], isPreset: boolean, itemDetails: [boolean, ITemplateItem]): Promise<void> => {
        //         const itemHelper = this.container.resolve<ItemHelper>("ItemHelper")
        //
        //         if (!isPreset || !itemHelper.isOfBaseclass(itemDetails[1]._id, BaseClasses.WEAPON))
        //         {
        //             return result["createSingleOfferForItem"](itemWithChildren, isPreset, itemDetails);
        //         }
        //
        //         let newItems: Item[]
        //         try
        //         {
        //             newItems = this.generateRandomWeapon(itemWithChildren[0].parentId, itemDetails[1]._id)
        //         }
        //         catch (e)
        //         {
        //             this.logger.warning(`[RandomizedRagfairOfferGenerator] Failed to generate random weapon for item <${itemDetails[1]._id}>`)
        //             this.logger.debug(e.message)
        //             newItems = itemWithChildren
        //         }
        //
        //         return result["createSingleOfferForItem"](newItems, isPreset, itemDetails);
        //     }
        // })
        // this.logger.success(`[${this.mod}] RagfairOfferGenerator functions hooked.`)

    }

    private generateRandomWeapon(parentId: string, weaponTpl: string): Item[]
    {
        this.logger.debug(`Generating random weapon for ${weaponTpl}`)

        // const botGeneratorHelper = this.container.resolve<BotGeneratorHelper>("BotGeneratorHelper")
        const botWeaponGenerator: BotWeaponGenerator = Statics.container.resolve<BotWeaponGenerator>("BotWeaponGenerator")
        const botHelper: BotHelper = this.container.resolve<BotHelper>("BotHelper")
        const botLevelGenerator: BotLevelGenerator = this.container.resolve<BotLevelGenerator>("BotLevelGenerator")
        const profileHelper: ProfileHelper = this.container.resolve<ProfileHelper>("ProfileHelper")

        // const hashUtil = this.container.resolve<HashUtil>("HashUtil")
        const itemHelper = this.container.resolve<ItemHelper>("ItemHelper")
        const randomUtil = this.container.resolve<RandomUtil>("RandomUtil")
        const jsonUtil = this.container.resolve<JsonUtil>("JsonUtil")

        const configServer = this.container.resolve<ConfigServer>("ConfigServer")
        const pmcConfig = configServer.getConfig<IPmcConfig>(ConfigTypes.PMC);

        // const weaponTemplate = itemHelper.getItem(weaponTpl)[1];

        // const rootItem: Item = {
        //     _id: hashUtil.generate(),
        //     _tpl: weaponTpl,
        //     parentId: parentId,
        //     slotId: null,
        //     upd: {} // ...botGeneratorHelper.generateExtraPropertiesForItem(weaponTemplate, null) // TODO *upd*
        // }
        //
        // if (randomUtil.getChance100(pmcConfig.weaponHasEnhancementChancePercent))
        // {
        //     const weaponConfig = configServer.getConfig<IRepairConfig>(ConfigTypes.REPAIR).repairKit.weapon
        //     const repairService = container.resolve<RepairService>("RepairService")
        //     repairService.addBuff(weaponConfig, rootItem)
        // }

        const sessionId = this.getRandomSid()
        const pmcProfile = profileHelper.getPmcProfile(sessionId);
        if (!pmcProfile) throw new Error(`PMC profile not found for ${sessionId}`)


        const equipmentSlot = randomUtil.getArrayValue([
            EquipmentSlots.FIRST_PRIMARY_WEAPON,
            EquipmentSlots.FIRST_PRIMARY_WEAPON,
            EquipmentSlots.FIRST_PRIMARY_WEAPON,
            EquipmentSlots.HOLSTER,
        ]);

        const botGenerationDetails: BotGenerationDetails = {
            isPmc: true,
            role: botHelper.getRandomizedPmcRole(),
            side: "Savage",
            playerLevel: pmcProfile.Info.Level,
            playerName: pmcProfile.Info.Nickname,
            botRelativeLevelDeltaMax: pmcConfig.botRelativeLevelDeltaMax,
            botRelativeLevelDeltaMin: pmcConfig.botRelativeLevelDeltaMin,
            botCountToGenerate: 1,
            botDifficulty: randomUtil.getArrayValue(["easy", "normal", "hard", "impossible"]),
            isPlayerScav: false
        };

        botGenerationDetails.side = botHelper.getPmcSideByRole(botGenerationDetails.role);

        const botTemplate = jsonUtil.clone(botHelper.getBotTemplate(botGenerationDetails.side))

        const inventory = botTemplate.inventory;
        const weaponModChances = botTemplate.chances.weaponMods

        const botLevel = botLevelGenerator.generateBotLevel(
            botTemplate.experience.level,
            botGenerationDetails,
            null
        ).level;

        const weaponGenerationResult = botWeaponGenerator.generateWeaponByTpl(
            sessionId,
            weaponTpl,
            equipmentSlot,
            inventory,
            parentId,
            weaponModChances,
            botGenerationDetails.role.toLowerCase(),
            true,
            botLevel
        )

        // remove ammo
        return weaponGenerationResult.weapon.filter(item => !itemHelper.isOfBaseclass(item._tpl, BaseClasses.AMMO))

    }

    private getRandomSid(): string
    {
        const saveServer = this.container.resolve<SaveServer>("SaveServer")
        const randomUtil = this.container.resolve<RandomUtil>("RandomUtil")

        const ids: string[] = [];

        for (const id in saveServer["profiles"])
        {
            ids.push(id)
        }

        const seed = randomUtil.getInt(1, 256)
        const randomSid = ids[seed % ids.length]

        return randomSid
    }
}

module.exports = { mod: new Mod() }