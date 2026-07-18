'use strict';

const { ZigBeeDevice } = require("homey-zigbeedriver");

const SonoffOnOffCluster = require("../../lib/SonoffOnOffCluster");
//const SonoffOnOffSwitchCluster = require("../../lib/SonoffOnOffSwitchCluster");

const { Cluster, CLUSTER } = require('zigbee-clusters');

Cluster.addCluster(SonoffOnOffCluster);
//Cluster.addCluster(SonoffOnOffSwitchCluster);

class SonoffZBMINIL extends ZigBeeDevice {

    async onInit() {
        // Self-healing: restore any capabilities declared in the manifest that are missing from the device instance
        let manifestCapabilities = this.driver.manifest?.capabilities;
        if (!manifestCapabilities) {
            const Homey = require('homey');
            const driverManifest = Homey.manifest?.drivers?.find(d => d.id === this.driver.id);
            manifestCapabilities = driverManifest?.capabilities || [];
        }

        this.log(`[Self-healing Debug] Device: ${this.getName()}, Manifest capabilities:`, manifestCapabilities, 'Device capabilities:', this.getCapabilities());
        for (const cap of manifestCapabilities) {
            if (!this.hasCapability(cap)) {
                this.log(`[Self-healing] Restoring missing capability: ${cap}`);
                this.addCapability(cap).catch(this.error);
            }
        }

        // Self-healing class migration for devices with 'migrate_to_socket' capability
        if (this.hasCapability('migrate_to_socket')) {
            this.log(`[Self-healing] Migrating ${this.getName()} class to socket...`);
            this.setClass('socket')
                .then(() => {
                    this.log(`[Self-healing] Successfully migrated ${this.getName()} to socket. Removing migrate_to_socket capability...`);
                    return this.removeCapability('migrate_to_socket');
                })
                .catch(this.error);
        }

        await super.onInit();
    }

  /**
   * onNodeInit is called when the device is initialized.
   * This is a public method.
   *
   * @public
   * @param {object} args - Arguments.
   * @param {object} args.zclNode - The ZCL Node instance.
   * @returns {Promise<void>}
   */
    async onNodeInit({ zclNode }) {
        this.log('Device initialized');
        if (process.env.DEBUG === "1") {
            this.printNode();
        }

        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', CLUSTER.ON_OFF);
        }

        try {
            const { powerOnBehavior } = await this.zclNode.endpoints[1].clusters.onOff.readAttributes('powerOnBehavior');
            //const { switchType, switchAction } = await this.zclNode.endpoints[1].clusters.onOffSwitch.readAttributes('switchType', 'switchAction');
            await this.setSettings({ power_on_behavior: powerOnBehavior }).catch(this.error); //, switch_type: switchType });
        } catch (e) {
            this.log("Could not read / update device settings", e);
        }
    }

    /**
     * onSettings is called when the user updates the device's settings.
     * @param {object} event the onSettings event data
     * @param {object} event.oldSettings The old settings object
     * @param {object} event.newSettings The new settings object
     * @param {string[]} event.changedKeys An array of keys changed since the previous version
     * @returns {Promise<string|void>} return a custom message that will be displayed
     */
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        if (changedKeys.includes("power_on_behavior")) {
            try {
                await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ powerOnBehavior: newSettings.power_on_behavior });
            } catch (error) {
                this.log("Error updating the power on behavior");
            }
        }

        // if (changedKeys.includes('switch_type')) {
        //     try {
        //         // TODO: apparently readonly?
        //         await this.zclNode.endpoints[1].clusters.onOffSwitch.writeAttributes({ switchType: newSettings.switch_type });
        //     } catch (error) {
        //         this.log("Error updating the switch type");
        //     }
        // }
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
    async onDeleted() {
        this.log("smartswitch removed");
    }

}

module.exports = SonoffZBMINIL;
