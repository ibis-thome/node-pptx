let { Utils } = require("./utils");

class PptxContentHelper {
    // Given the "content" block from the root (ex: PowerPointFactory.content), this function will pull out every slide and return very basic info on them.
    // (Right now, it's just the slide layout name used on each slide and the relId for that layout-to-slide relationship.)
    static extractInfoFromSlides(content) {
        let slideInformation = {}; // index is slide name

        for (let key in content) {
            if (key.substr(0, 16) === 'ppt/slides/slide') {
                let slideName = key.substr(11, key.lastIndexOf('.') - 11);
                let slideRelsKey = `ppt/slides/_rels/${slideName}.xml.rels`;
                let slideLayoutRelsNode = content[slideRelsKey]['Relationships']['Relationship'].filter(function(element) {
                    return element['$']['Type'] === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout';
                })[0];

                let relId = slideLayoutRelsNode['$'].Id;
                let target = slideLayoutRelsNode['$'].Target;
                let layout = target.substr(target.lastIndexOf('/') + 1);
                layout = layout.substr(0, layout.indexOf('.'));

                //master info
                let master, masterRelId;
                if(layout) {
                    let masterRel = content[`ppt/slideLayouts/_rels/${layout}.xml.rels`].Relationships.Relationship.find(relationShip => relationShip.$.Type.indexOf("slideMaster") >= 0);
                    master = masterRel ? masterRel.$.Target.split("/").slice(-1)[0].split(".")[0] : "";
                    masterRelId = masterRel ? masterRel.$.Id : "";
                }

                //theme info
                let theme, themeRelId;
                if(master) {
                    let themeRel = content[`ppt/slideMasters/_rels/${master}.xml.rels`].Relationships.Relationship.find(relationShip => relationShip.$.Type.indexOf("theme") >= 0);
                    theme = themeRel ? themeRel.$.Target.split("/").slice(-1)[0].split(".")[0] : "";
                    themeRelId = theme ? themeRel.$.Id : "";
                }

                let objectInfo = PptxContentHelper.extractSlideObjectInfo(content, slideName);

                slideInformation[slideName] = { 
                    name: slideName, 
                    layout: { 
                        relId: relId, 
                        name: layout, 
                        master: { 
                            relId: masterRelId, 
                            name: master, 
                            theme: { 
                                relId: themeRelId, 
                                name: theme 
                            } 
                        } 
                    }, 
                    objectCount: objectInfo.objectCount
                };
            }
        }

        return slideInformation;
    }

    static extractSlideObjectInfo(content, slideName) {
        let objectInfo = {
            objectCount: 0,
        };

        objectInfo.shapes = Utils.getPath(content, ['p:sld', 'p:cSld', 0, 'p:spTree', 0, 'p:sp']) || [];
        objectInfo.images = Utils.getPath(content, ['p:sld', 'p:cSld', 0, 'p:spTree', 0, 'p:pic']) || [];
        objectInfo.connectors = Utils.getPath(content, ['p:sld', 'p:cSld', 0, 'p:spTree', 0, 'p:cxnSp']) || [];

        objectInfo.objectCount = objectInfo.shapes.length + objectInfo.images.length + objectInfo.connectors.length;

        return objectInfo;
    }

    static extractNodes(contentBlock) {
        let existingNodes = [];

        for (let key in contentBlock) {
            if (contentBlock.hasOwnProperty(key)) {
                existingNodes.push({ key: key, node: contentBlock[key] });
                delete contentBlock[key];
            }
        }

        return existingNodes;
    }

    static restoreNodes(contentBlock, nodes) {
        for (let i = 0; i < nodes.length; i++) {
            contentBlock[nodes[i].key] = nodes[i].node;
        }
    }
}

module.exports.PptxContentHelper = PptxContentHelper;
