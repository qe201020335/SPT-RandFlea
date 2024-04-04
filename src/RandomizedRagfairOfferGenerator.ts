import {inject, injectable} from "tsyringe";
import {RagfairOfferGenerator} from "@spt-aki/generators/RagfairOfferGenerator";
import {ILogger} from "@spt-aki/models/spt/utils/ILogger";
import {JsonUtil} from "@spt-aki/utils/JsonUtil";
import {DatabaseServer} from "@spt-aki/servers/DatabaseServer";
import {LocalisationService} from "@spt-aki/services/LocalisationService";
import {ConfigServer} from "@spt-aki/servers/ConfigServer";
import {HashUtil} from "@spt-aki/utils/HashUtil";
import {RandomUtil} from "@spt-aki/utils/RandomUtil";
import {TimeUtil} from "@spt-aki/utils/TimeUtil";
import {RagfairServerHelper} from "@spt-aki/helpers/RagfairServerHelper";
import {HandbookHelper} from "@spt-aki/helpers/HandbookHelper";
import {SaveServer} from "@spt-aki/servers/SaveServer";
import {PresetHelper} from "@spt-aki/helpers/PresetHelper";
import {RagfairAssortGenerator} from "@spt-aki/generators/RagfairAssortGenerator";
import {RagfairOfferService} from "@spt-aki/services/RagfairOfferService";
import {RagfairPriceService} from "@spt-aki/services/RagfairPriceService";
import {PaymentHelper} from "@spt-aki/helpers/PaymentHelper";
import {FenceService} from "@spt-aki/services/FenceService";
import {ItemHelper} from "@spt-aki/helpers/ItemHelper";
import {Item} from "@spt-aki/models/eft/common/tables/IItem";
import {ITemplateItem} from "@spt-aki/models/eft/common/tables/ITemplateItem";
import {BotWeaponGenerator} from "@spt-aki/generators/BotWeaponGenerator";
import {BotHelper} from "@spt-aki/helpers/BotHelper";
import {EquipmentSlots} from "@spt-aki/models/enums/EquipmentSlots";
import {BotGenerationDetails} from "@spt-aki/models/spt/bots/BotGenerationDetails";
import {BotLevelGenerator} from "@spt-aki/generators/BotLevelGenerator";
import {ProfileHelper} from "@spt-aki/helpers/ProfileHelper";
import {IPmcConfig} from "@spt-aki/models/spt/config/IPmcConfig";
import {ConfigTypes} from "@spt-aki/models/enums/ConfigTypes";
import {Statics} from "./statics";
import {BaseClasses} from "@spt-aki/models/enums/BaseClasses";

@injectable()
export class RandomizedRagfairOfferGenerator extends RagfairOfferGenerator
{
    protected pmcConfig: IPmcConfig;

    constructor(
        @inject("WinstonLogger") logger: ILogger,
        @inject("JsonUtil") jsonUtil: JsonUtil,
        @inject("HashUtil") hashUtil: HashUtil,
        @inject("RandomUtil") randomUtil: RandomUtil,
        @inject("TimeUtil") timeUtil: TimeUtil,
        @inject("DatabaseServer") databaseServer: DatabaseServer,
        @inject("RagfairServerHelper") ragfairServerHelper: RagfairServerHelper,
        @inject("HandbookHelper") handbookHelper: HandbookHelper,
        @inject("SaveServer") saveServer: SaveServer,
        @inject("PresetHelper") presetHelper: PresetHelper,
        @inject("RagfairAssortGenerator") ragfairAssortGenerator: RagfairAssortGenerator,
        @inject("RagfairOfferService") ragfairOfferService: RagfairOfferService,
        @inject("RagfairPriceService") ragfairPriceService: RagfairPriceService,
        @inject("LocalisationService") localisationService: LocalisationService,
        @inject("PaymentHelper") paymentHelper: PaymentHelper,
        @inject("FenceService") fenceService: FenceService,
        @inject("ItemHelper") itemHelper: ItemHelper,
        @inject("ConfigServer") configServer: ConfigServer,
    )
    {
        super(logger, jsonUtil, hashUtil, randomUtil, timeUtil, databaseServer, ragfairServerHelper, handbookHelper, saveServer, presetHelper, ragfairAssortGenerator, ragfairOfferService, ragfairPriceService, localisationService, paymentHelper, fenceService, itemHelper, configServer)
        this.pmcConfig = this.configServer.getConfig(ConfigTypes.PMC);
    }

    public static readonly specialSid = "__random_id__";

    protected override async createSingleOfferForItem(itemWithChildren: Item[], isPreset: boolean, itemDetails: [boolean, ITemplateItem]): Promise<void>
    {

        if (!isPreset || !this.itemHelper.isOfBaseclass(itemDetails[1]._id, BaseClasses.WEAPON))
        {
            return super.createSingleOfferForItem(itemWithChildren, isPreset, itemDetails);
        }

        let newItems: Item[]
        try
        {
            newItems = this.generateRandomizedWeapon(itemWithChildren[0].parentId, itemDetails[1]._id)
        }
        catch (e)
        {
            this.logger.warning(`[RandomizedRagfairOfferGenerator] Failed to generate random weapon for item <${itemDetails[1]._id}>`)
            this.logger.debug(e.message)
            newItems = itemWithChildren
        }

        return super.createSingleOfferForItem(newItems, isPreset, itemDetails);
    }

    private generateRandomizedWeapon(parentId: string, tpl: string): Item[]
    {
        //TODO remove dependency on bot generator and write our own logic
        const botWeaponGenerator: BotWeaponGenerator = Statics.container.resolve<BotWeaponGenerator>("BotWeaponGenerator")
        const botHelper: BotHelper = Statics.container.resolve<BotHelper>("BotHelper")
        const botLevelGenerator: BotLevelGenerator = Statics.container.resolve<BotLevelGenerator>("BotLevelGenerator")
        const profileHelper: ProfileHelper = Statics.container.resolve<ProfileHelper>("ProfileHelper")


        //randomize weapon mods using bot generation

        const profileSeed = this.randomUtil.getInt(1, 256)
        const customSid = RandomizedRagfairOfferGenerator.specialSid + profileSeed;
        const pmcProfile = profileHelper.getPmcProfile(customSid);

        const equipmentSlot = this.randomUtil.getArrayValue([
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
            botRelativeLevelDeltaMax: this.pmcConfig.botRelativeLevelDeltaMax,
            botRelativeLevelDeltaMin: this.pmcConfig.botRelativeLevelDeltaMin,
            botCountToGenerate: 1,
            botDifficulty: this.randomUtil.getArrayValue(["easy", "normal", "hard", "impossible"]),
            isPlayerScav: false
        };

        botGenerationDetails.side = botHelper.getPmcSideByRole(botGenerationDetails.role);

        const botTemplate = this.jsonUtil.clone(botHelper.getBotTemplate(botGenerationDetails.side))

        const inventory = botTemplate.inventory;
        const weaponModChances = botTemplate.chances.weaponMods

        const botLevel = botLevelGenerator.generateBotLevel(
            botTemplate.experience.level,
            botGenerationDetails,
            null
        ).level;

        const weaponGenerationResult = botWeaponGenerator.generateWeaponByTpl(
            customSid,
            tpl,
            equipmentSlot,
            inventory,
            parentId,
            weaponModChances,
            botGenerationDetails.role.toLowerCase(),
            true,
            botLevel
        )

        // remove ammo
        return weaponGenerationResult.weapon.filter(item => !this.itemHelper.isOfBaseclass(item._tpl, BaseClasses.AMMO))
    }
}