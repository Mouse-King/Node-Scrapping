const express = require("express");
const router = express.Router();
const axios = require("axios");
const cheerio = require("cheerio");
const json2csv = require("json2csv");
const fs = require("fs");

router.get("/", async (req, res, next) => {
  let token = "",
    time = "",
    limit = 30,
    i = 0,
    result = [];
  let response = await axios.get(
    "https://expowest24.smallworldlabs.com/exhibitors"
  );
  let match = response.data.match(/var tk='(.*?)'/);
  token = match[1];
  match = response.data.match(/var tm='(.*?)'/);
  time = match[1];
  do {
    let formData = new FormData();
    formData.append("limit", limit);
    formData.append("offset", i * limit);
    formData.append("module", "organizations_organization_list");
    formData.append("site_page_id", 3000);
    formData.append("method", "paginationHandler");
    formData.append("template", "generic_items");
    formData.append("mCell", 0);
    formData.append("mId", 0);
    formData.append("page_id", "openAjax");
    formData.append("tk", token);
    formData.append("tm", time);
    formData.append("ajaxType", "paginate");
    response = await axios.post(
      "https://expowest24.smallworldlabs.com/index.php",
      formData
    );

    total = response.data.total;
    token = response.data.formToken;
    time = response.data.formTime;
    const $ = cheerio.load(decodeURIComponent(response.data.data));
    let tRows = $("tbody tr").length;
    function getKey(val) {
      switch (val) {
        case "Name":
          return "name";
        case "What We Do":
          return "whatWeDo";
        case "Founded":
          return "foundedAt";
        case "Website":
          return "website";
        case "Categories":
          return "categories";
        case "SubExpo":
          return "subExpo";
        case "Phone":
          return "phone";
        case "Address":
          return "address";
        case "Facebook":
          return "facebook";
        case "Linkedin":
          return "linkedin";
        case "Twitter":
          return "twitter";
      }
    }
    for (let j = 0; j < tRows; j++) {
      let href = $("tbody tr")
        .eq(j)
        .children("td")
        .eq(1)
        .find("a.generic-option-link")
        .attr("href");
      response = await axios.get(
        `https://expowest24.smallworldlabs.com${href}`
      );
      let _$ = cheerio.load(response.data);
      let row = {
        name: "",
        whatWeDo: "",
        foundedAt: "",
        website: "",
        categories: "",
        subExpo: "",
        phone: "",
        address: "",
        facebook: "",
        linkedin: "",
        twitter: "",
        organizations: "",
      };
      _$(".col .tab-pane")
        .eq(0)
        .children(".row")
        .each(function (idx, elm) {
          let key = getKey(
            _$(elm).find(".col-4 > .text-secondary").text().trim()
          );
          row[key] = _$(elm).find(".col-8 > .profileResponse").text().trim();
        });
      _$(".col .tab-pane")
        .eq(1)
        .children(".row")
        .each(function (idx, elm) {
          let key = getKey(
            _$(elm).find(".col-4 > .text-secondary").text().trim()
          );
          row[key] = _$(elm).find(".col-8 > .profileResponse").text().trim();
        });
      let organizations = "";
      _$(".organizations_member_list .generic-list-wrapper > div").each(
        function (idx, elm) {
          if (organizations == "") {
            organizations += $(elm).text().trim();
          } else {
            organizations += `, ${$(elm).text().trim()}`;
          }
        }
      );
      row["organizations"] = organizations;
      result.push(row);
    }
    i++;
    console.log(i)
  } while (i * limit < total);

  const csv = json2csv.parse(result);
  const csvName = Date.now();
  fs.writeFileSync(`./${csvName}.csv`, csv);
  return res.json({
    status: true,
    result: result,
  });
});

module.exports = router;
