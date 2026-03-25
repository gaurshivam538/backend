
import {Router} from "express"
import { searchbar } from "../controllers/searchController.js";

const router = Router(); 

router.route("/search").get(searchbar)


export default router;